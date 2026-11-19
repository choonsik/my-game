"use client";

import { useEffect, useRef } from "react";
import {
  ArcType,
  Axis,
  Cartesian3,
  Cartographic,
  type Cesium3DTileset,
  CesiumWidget,
  Color,
  ConstantPositionProperty,
  createGooglePhotorealistic3DTileset,
  Credit,
  DistanceDisplayCondition,
  Entity,
  HeadingPitchRoll,
  Ion,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Model,
  NearFarScalar,
  PolylineGlowMaterialProperty,
  Transforms,
  VerticalOrigin,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Workers, Assets 등 정적 파일은 scripts/copy-cesium-assets.mjs가 public/cesium에 복사한다.
(window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";

export type FlightFlag = {
  id: string;
  latitude: number;
  longitude: number;
  acquired: boolean;
};

export type AcquireMethod = "shot" | "touch";

/** 한 번의 비행. id가 바뀌면 헬기를 start에서 새로 출발시킨다. */
export type FlightSession = {
  id: number;
  start: { latitude: number; longitude: number };
};

export type FlightViewProps = {
  accessToken: string;
  /** null이면 화면을 그리지 않고 쉰다. 위젯과 타일은 다음 비행을 위해 남겨 둔다. */
  session: FlightSession | null;
  flags: FlightFlag[];
  /** false면 조작과 획득을 멈춘다. */
  active: boolean;
  onReady: () => void;
  onError: (message: string) => void;
  onAcquire: (flagId: string, method: AcquireMethod) => void;
  onShoot: () => void;
  /** 매 프레임 헬기 속도(0~1, 최고 속도 대비)를 알린다. */
  onSpeed: (ratio: number) => void;
};

export const VISIBLE_DISTANCE_METERS = 200;
export const TOUCH_DISTANCE_METERS = 30;
const SHOT_CONE_RADIANS = CesiumMath.toRadians(10);
const START_ABOVE_GROUND_METERS = 120;
const FALLBACK_SURFACE_METERS = 60;
const FLAG_HOVER_METERS = 25;
const MIN_CLEARANCE_METERS = 8;
const READY_MIN_WAIT_MS = 800;
const READY_MAX_WAIT_MS = 20_000;

// 헬기 움직임
const CRUISE_SPEED = 45;
const BOOST_SPEED = 140;
const REVERSE_SPEED = 15;
const ACCELERATION = 1.6; // 목표 속도로 다가가는 빠르기(1/s)
const DRAG = 0.7; // 키를 뗐을 때 느려지는 빠르기(1/s)
const YAW_RATE = CesiumMath.toRadians(70);
const CLIMB_SPEED = 18;
const MAX_BANK = CesiumMath.toRadians(28);
const MAX_NOSE_DOWN = CesiumMath.toRadians(12);

// 카메라는 헬기 뒤쪽 위에서 살짝 늦게 따라간다.
const CHASE_BACK_METERS = 40;
const CHASE_UP_METERS = 12;
const CAMERA_HEADING_LAG = 4; // 클수록 빨리 따라온다(1/s)
const CAMERA_POSITION_LAG = 6;

// 모델(Poly Pizza "Helicopter", Poly by Google, CC BY 3.0)은 원점에서 멀고 단위가 크다.
// glTF 좌표(Y-up)의 몸체 Object013: 길이 Z 621, 중심 (-932, 118, -53). 기수는 -Z 쪽이다.
const MODEL_URL = "/models/helicopter.glb";
const MODEL_SCALE = 13 / 621; // 몸체 길이 13m
// Y-up → Z-up 변환 후의 몸체 중심 (x, -z, y)
const MODEL_CENTER = new Cartesian3(-932, 53, 118);
const MODEL_LOCAL = Matrix4.multiply(
  Matrix4.fromUniformScale(MODEL_SCALE),
  Matrix4.fromTranslation(Cartesian3.negate(MODEL_CENTER, new Cartesian3())),
  new Matrix4()
);
// 로터: glTF 좌표에서의 회전축 위치
const MAIN_ROTOR_NODES = ["Box04_Box014", "Box20183", "Cylinder005", "Cylinder006"];
const MAIN_ROTOR_CENTER = new Cartesian3(-932, 0, -173); // Y축으로 돈다
const TAIL_ROTOR_NODES = ["Cylinder007", "Object014"];
const TAIL_ROTOR_CENTER = new Cartesian3(0, 215, 248); // X축으로 돈다
const MAIN_ROTOR_SPIN = 2 * Math.PI * 5; // rad/s
const TAIL_ROTOR_SPIN = 2 * Math.PI * 12;

function rotationAbout(center: Cartesian3, rotation: Matrix3) {
  const toOrigin = Matrix4.fromTranslation(Cartesian3.negate(center, new Cartesian3()));
  const back = Matrix4.fromTranslation(center);
  const rotate = Matrix4.fromRotation(rotation);
  return Matrix4.multiply(back, Matrix4.multiply(rotate, toOrigin, new Matrix4()), new Matrix4());
}

const FLAG_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96" viewBox="0 0 64 96">
    <defs><radialGradient id="g"><stop offset="0" stop-color="#fff7b0"/><stop offset="1" stop-color="#fff7b0" stop-opacity="0"/></radialGradient></defs>
    <circle cx="34" cy="26" r="30" fill="url(#g)"/>
    <rect x="10" y="8" width="5" height="86" rx="2" fill="#5b4a1a"/>
    <path d="M15 10 L58 22 L15 38 Z" fill="#f5c518" stroke="#a8800a" stroke-width="2"/>
    <circle cx="30" cy="23" r="5" fill="#fff"/>
  </svg>`
)}`;

const CONTROL_KEYS = new Set([
  "KeyW", "KeyS", "KeyA", "KeyD", "KeyE", "KeyQ",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "ShiftLeft", "ShiftRight", "Space",
]);

/** 위치와 방향에서 진행 방향(지역 수평면 기준) 단위 벡터 */
function forwardVector(position: Cartesian3, heading: number) {
  const enu = Transforms.eastNorthUpToFixedFrame(position);
  const local = new Cartesian3(Math.sin(heading), Math.cos(heading), 0);
  return Cartesian3.normalize(
    Matrix4.multiplyByPointAsVector(enu, local, new Cartesian3()),
    new Cartesian3()
  );
}

type Controller = { start: (session: FlightSession) => void; pause: () => void };

export function FlightView(props: FlightViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<CesiumWidget | null>(null);
  const controllerRef = useRef<Controller | null>(null);
  const readyRef = useRef(false);
  const entitiesRef = useRef(new Map<string, Entity>());
  const reportedRef = useRef(new Set<string>());
  const propsRef = useRef(props);

  useEffect(() => {
    propsRef.current = props;
  });

  // 위젯, 실사 타일셋, 헬기는 페이지당 한 번만 만든다. (Google 타일 root 요청도 한 번)
  function mount(container: HTMLDivElement): (() => void) | undefined {
    const entities = entitiesRef.current;
    Ion.defaultAccessToken = propsRef.current.accessToken;

    let widget: CesiumWidget;
    try {
      widget = new CesiumWidget(container, {
        baseLayer: false,
        globe: false,
        shouldAnimate: true,
        showRenderLoopErrors: false,
        msaaSamples: 1,
      });
    } catch {
      const message =
        "이 브라우저에서 3D 화면(WebGL)을 시작하지 못했어요. 하드웨어 가속이 켜져 있는지 확인해 주세요.";
      controllerRef.current = { start: () => propsRef.current.onError(message), pause: () => {} };
      return;
    }
    widgetRef.current = widget;
    const { scene, camera } = widget;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
    scene.screenSpaceCameraController.enableInputs = false;
    scene.postProcessStages.fxaa.enabled = true;
    widget.useDefaultRenderLoop = false;
    widget.creditDisplay.addStaticCredit(
      new Credit(
        '<a href="https://poly.pizza/m/cTzINMr0WdS" target="_blank" rel="noreferrer">Helicopter</a> by Poly by Google (CC BY 3.0)',
        true
      )
    );

    // 헬기 상태
    const heli = {
      longitude: 0,
      latitude: 0,
      height: 0,
      heading: 0,
      speed: 0,
      climb: 0,
      yawRate: 0,
      bank: 0,
      noseDown: 0,
      mainRotor: 0,
      tailRotor: 0,
    };
    let cameraHeading = 0;
    const cameraPosition = new Cartesian3();
    const heliPosition = () => Cartesian3.fromRadians(heli.longitude, heli.latitude, heli.height);

    let model: Model | undefined;
    const placeModel = () => {
      if (!model) return;
      const frame = Transforms.headingPitchRollToFixedFrame(
        heliPosition(),
        new HeadingPitchRoll(heli.heading, -heli.noseDown, heli.bank)
      );
      Matrix4.multiply(frame, MODEL_LOCAL, model.modelMatrix);
      // getNode는 모델이 다 준비되기 전에 부르면 예외를 던져 렌더 루프를 멈춘다.
      if (!model.ready) return;
      const main = rotationAbout(MAIN_ROTOR_CENTER, Matrix3.fromRotationY(heli.mainRotor));
      const tail = rotationAbout(TAIL_ROTOR_CENTER, Matrix3.fromRotationX(heli.tailRotor));
      for (const name of MAIN_ROTOR_NODES) {
        const node = model.getNode(name);
        if (node) node.matrix = main;
      }
      for (const name of TAIL_ROTOR_NODES) {
        const node = model.getNode(name);
        if (node) node.matrix = tail;
      }
    };

    const desiredCamera = () => {
      const position = heliPosition();
      const back = forwardVector(position, cameraHeading);
      const up = Cartesian3.normalize(position, new Cartesian3());
      return Cartesian3.add(
        position,
        Cartesian3.add(
          Cartesian3.multiplyByScalar(back, -CHASE_BACK_METERS, new Cartesian3()),
          Cartesian3.multiplyByScalar(up, CHASE_UP_METERS, new Cartesian3()),
          new Cartesian3()
        ),
        new Cartesian3()
      );
    };
    const placeCamera = (snap: boolean, dt = 0) => {
      const desired = desiredCamera();
      if (snap) Cartesian3.clone(desired, cameraPosition);
      else Cartesian3.lerp(cameraPosition, desired, Math.min(1, CAMERA_POSITION_LAG * dt), cameraPosition);
      camera.setView({
        destination: cameraPosition,
        orientation: {
          heading: cameraHeading,
          pitch: -Math.atan2(CHASE_UP_METERS, CHASE_BACK_METERS) * 0.6,
          roll: 0,
        },
      });
    };

    let destroyed = false;
    Model.fromGltfAsync({ url: MODEL_URL, upAxis: Axis.Y, forwardAxis: Axis.X })
      .then((loaded) => {
        if (destroyed) {
          loaded.destroy();
          return;
        }
        model = loaded;
        scene.primitives.add(model);
        placeModel();
      })
      .catch(() => {});

    let tileset: Cesium3DTileset | undefined;
    let tilesetError: string | null = null;
    createGooglePhotorealistic3DTileset(
      { onlyUsingWithGoogleGeocoder: true },
      { showCreditsOnScreen: true, maximumScreenSpaceError: 24, cacheBytes: 1024 * 1024 * 1024 }
    )
      .then((loaded) => {
        if (destroyed) {
          loaded.destroy();
          return;
        }
        tileset = loaded;
        scene.primitives.add(tileset);
      })
      .catch((error: unknown) => {
        if (destroyed) return;
        tilesetError = error instanceof Error ? error.message : String(error);
        if (session) propsRef.current.onError(tilesetError);
      });

    // 비행 시작과 쉬기
    let session: FlightSession | null = null;
    let waitingSince: number | null = null;
    const keys = new Set<string>();
    controllerRef.current = {
      start(next) {
        session = next;
        readyRef.current = false;
        keys.clear();
        Object.assign(heli, {
          longitude: CesiumMath.toRadians(next.start.longitude),
          latitude: CesiumMath.toRadians(next.start.latitude),
          height: FALLBACK_SURFACE_METERS + START_ABOVE_GROUND_METERS,
          heading: 0,
          speed: 0,
          climb: 0,
          yawRate: 0,
          bank: 0,
          noseDown: 0,
        });
        cameraHeading = 0;
        placeModel();
        placeCamera(true);
        widget.resize();
        widget.useDefaultRenderLoop = true;
        if (tilesetError) {
          propsRef.current.onError(tilesetError);
          return;
        }
        waitingSince = performance.now();
      },
      pause() {
        session = null;
        readyRef.current = false;
        waitingSince = null;
        keys.clear();
        widget.useDefaultRenderLoop = false;
      },
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!session || !CONTROL_KEYS.has(event.code)) return;
      event.preventDefault();
      if (event.code === "Space" && !event.repeat) shoot();
      keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (session && CONTROL_KEYS.has(event.code)) event.preventDefault();
      keys.delete(event.code);
    };
    const onBlur = () => keys.clear();
    const pressed = (...codes: string[]) => codes.some((code) => keys.has(code));
    const canControl = () => propsRef.current.active && readyRef.current;

    const report = (id: string, method: AcquireMethod) => {
      if (reportedRef.current.has(id)) return;
      reportedRef.current.add(id);
      propsRef.current.onAcquire(id, method);
    };

    // 쏘기: 헬기 정면 원뿔 안의 가장 가까운 플래그를 맞힌다.
    let laser: Entity | undefined;
    let laserTimer: ReturnType<typeof setTimeout> | undefined;
    const shoot = () => {
      if (!canControl()) return;
      propsRef.current.onShoot();
      const origin = heliPosition();
      const forward = forwardVector(origin, heli.heading);

      if (laser) widget.entities.remove(laser);
      clearTimeout(laserTimer);
      laser = widget.entities.add({
        polyline: {
          positions: [
            origin,
            Cartesian3.add(
              origin,
              Cartesian3.multiplyByScalar(forward, VISIBLE_DISTANCE_METERS, new Cartesian3()),
              new Cartesian3()
            ),
          ],
          width: 8,
          arcType: ArcType.NONE,
          material: new PolylineGlowMaterialProperty({ color: Color.fromCssColorString("#ffe066"), glowPower: 0.3 }),
        },
      });
      laserTimer = setTimeout(() => {
        if (laser) widget.entities.remove(laser);
        laser = undefined;
      }, 150);

      let best: { id: string; distance: number } | undefined;
      for (const [id, entity] of entities) {
        if (!entity.show) continue;
        const position = entity.position?.getValue(widget.clock.currentTime);
        if (!position) continue;
        const toFlag = Cartesian3.subtract(position, origin, new Cartesian3());
        const distance = Cartesian3.magnitude(toFlag);
        if (distance > VISIBLE_DISTANCE_METERS) continue;
        if (
          Cartesian3.angleBetween(forward, toFlag) <= SHOT_CONE_RADIANS &&
          (!best || distance < best.distance)
        ) {
          best = { id, distance };
        }
      }
      if (best) report(best.id, "shot");
    };

    const surfaceBelow = () =>
      scene.sampleHeight(new Cartographic(heli.longitude, heli.latitude), [
        ...(model ? [model] : []),
        ...entities.values(),
        ...(laser ? [laser] : []),
      ]);

    let last = performance.now();
    let sinceGroundCheck = 0;
    const removeTick = widget.clock.onTick.addEventListener(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!session) return;

      // 새 위치의 타일이 다 뜨면 실제 지면 위 일정 높이에서 출발한다.
      if (waitingSince !== null && tileset) {
        const waited = now - waitingSince;
        if ((waited > READY_MIN_WAIT_MS && tileset.tilesLoaded) || waited > READY_MAX_WAIT_MS) {
          waitingSince = null;
          heli.height = (surfaceBelow() ?? FALLBACK_SURFACE_METERS) + START_ABOVE_GROUND_METERS;
          placeModel();
          placeCamera(true);
          readyRef.current = true;
          propsRef.current.onReady();
        }
      }

      // 로터는 조작과 상관없이 늘 돈다.
      const speedRatio = Math.min(1, Math.abs(heli.speed) / BOOST_SPEED);
      heli.mainRotor = (heli.mainRotor + MAIN_ROTOR_SPIN * (1 + 0.3 * speedRatio) * dt) % (2 * Math.PI);
      heli.tailRotor = (heli.tailRotor + TAIL_ROTOR_SPIN * dt) % (2 * Math.PI);
      propsRef.current.onSpeed(speedRatio);

      if (!canControl()) {
        placeModel();
        return;
      }

      // 전진·후진: 목표 속도로 서서히 다가가고, 키를 떼면 서서히 멈춘다.
      const forwardKey = pressed("KeyW", "ArrowUp");
      const backKey = pressed("KeyS", "ArrowDown");
      const boost = pressed("ShiftLeft", "ShiftRight");
      const target = forwardKey ? (boost ? BOOST_SPEED : CRUISE_SPEED) : backKey ? -REVERSE_SPEED : 0;
      const rate = forwardKey || backKey ? ACCELERATION : DRAG;
      heli.speed += (target - heli.speed) * Math.min(1, rate * dt);

      // 좌우 회전과 기울어짐
      const turn = (pressed("KeyD", "ArrowRight") ? 1 : 0) - (pressed("KeyA", "ArrowLeft") ? 1 : 0);
      heli.yawRate += (turn * YAW_RATE - heli.yawRate) * Math.min(1, 3 * dt);
      heli.heading = CesiumMath.zeroToTwoPi(heli.heading + heli.yawRate * dt);
      const bankTarget =
        (heli.yawRate / YAW_RATE) * MAX_BANK * Math.min(1, 0.4 + Math.abs(heli.speed) / CRUISE_SPEED);
      heli.bank += (bankTarget - heli.bank) * Math.min(1, 3 * dt);
      const noseTarget = (heli.speed / BOOST_SPEED) * MAX_NOSE_DOWN;
      heli.noseDown += (noseTarget - heli.noseDown) * Math.min(1, 2 * dt);

      // 상승·하강
      const climb = (pressed("KeyE") ? 1 : 0) - (pressed("KeyQ") ? 1 : 0);
      heli.climb += (climb * CLIMB_SPEED - heli.climb) * Math.min(1, 2.5 * dt);

      // 위치 갱신 (지역 동·북 방향)
      const step = heli.speed * dt;
      const radius = 6_371_000 + heli.height;
      heli.latitude += (Math.cos(heli.heading) * step) / radius;
      heli.longitude += (Math.sin(heli.heading) * step) / (radius * Math.cos(heli.latitude));
      heli.height += heli.climb * dt;

      // 지면 아래로 내려가지 않게 주기적으로 실제 표면 높이를 확인한다.
      sinceGroundCheck += dt;
      if (sinceGroundCheck > 0.2) {
        sinceGroundCheck = 0;
        const surface = surfaceBelow();
        if (surface !== undefined && heli.height < surface + MIN_CLEARANCE_METERS) {
          heli.height = surface + MIN_CLEARANCE_METERS;
          heli.climb = Math.max(0, heli.climb);
        }
      }

      cameraHeading +=
        CesiumMath.negativePiToPi(heli.heading - cameraHeading) * Math.min(1, CAMERA_HEADING_LAG * dt);
      placeModel();
      placeCamera(false, dt);

      // 헬기로 날아가 건드리면 획득
      const position = heliPosition();
      for (const [id, entity] of entities) {
        if (!entity.show) continue;
        const flagPosition = entity.position?.getValue(widget.clock.currentTime);
        if (flagPosition && Cartesian3.distance(position, flagPosition) <= TOUCH_DISTANCE_METERS) {
          report(id, "touch");
        }
      }
    });

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      destroyed = true;
      clearTimeout(laserTimer);
      removeTick();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      widget.destroy();
      widgetRef.current = null;
      controllerRef.current = null;
      readyRef.current = false;
      entities.clear();
    };
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // StrictMode가 effect를 곧바로 정리했다 다시 실행해도 위젯과 타일 요청은 한 번만 만든다.
    let cleanup: (() => void) | undefined;
    const timer = setTimeout(() => {
      cleanup = mount(container);
      const session = propsRef.current.session;
      if (session) controllerRef.current?.start(session);
    }, 0);
    return () => {
      clearTimeout(timer);
      cleanup?.();
    };
  }, []);

  // 비행이 바뀌면 헬기를 새로 출발시키고, 비행이 끝나면 쉰다.
  const sessionId = props.session?.id ?? null;
  useEffect(() => {
    const session = propsRef.current.session;
    if (session) {
      // 메뉴 버튼에 남은 포커스가 Space 입력을 가로채지 않게 한다.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      controllerRef.current?.start(session);
    } else {
      controllerRef.current?.pause();
    }
  }, [sessionId]);

  // 새 판의 플래그를 실제 표면 높이에 맞춰 심는다.
  const flagsKey = props.flags.map((f) => `${f.id}:${f.latitude}:${f.longitude}`).join("|");
  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    for (const entity of entitiesRef.current.values()) widget.entities.remove(entity);
    entitiesRef.current.clear();
    reportedRef.current.clear();
    if (flagsKey === "") return;

    const flags = propsRef.current.flags;
    let cancelled = false;
    const placed = flags.map((flag) => {
      const entity = widget.entities.add({
        id: flag.id,
        show: false,
        position: Cartesian3.fromDegrees(
          flag.longitude,
          flag.latitude,
          FALLBACK_SURFACE_METERS + FLAG_HOVER_METERS
        ),
        billboard: {
          image: FLAG_IMAGE,
          width: 64,
          height: 96,
          verticalOrigin: VerticalOrigin.BOTTOM,
          distanceDisplayCondition: new DistanceDisplayCondition(0, VISIBLE_DISTANCE_METERS),
          scaleByDistance: new NearFarScalar(20, 1.6, VISIBLE_DISTANCE_METERS, 0.7),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      return { flag, entity };
    });

    const show = (heights: (number | undefined)[]) => {
      if (cancelled) return;
      placed.forEach(({ flag, entity }, index) => {
        const surface = heights[index] ?? FALLBACK_SURFACE_METERS;
        entity.position = new ConstantPositionProperty(
          Cartesian3.fromDegrees(flag.longitude, flag.latitude, surface + FLAG_HOVER_METERS)
        );
        entity.show = !flag.acquired;
        entitiesRef.current.set(flag.id, entity);
      });
    };

    const positions = flags.map((f) => Cartographic.fromDegrees(f.longitude, f.latitude));
    const timeout = new Promise<undefined>((resolve) => setTimeout(resolve, 15_000));
    Promise.race([widget.scene.sampleHeightMostDetailed(positions), timeout])
      .then((sampled) => show((sampled ?? []).map((c) => c?.height)))
      .catch(() => show([]));

    return () => {
      cancelled = true;
    };
  }, [flagsKey]);

  // 획득한 플래그는 감춘다.
  useEffect(() => {
    for (const flag of props.flags) {
      const entity = entitiesRef.current.get(flag.id);
      if (entity && flag.acquired) entity.show = false;
    }
  }, [props.flags]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
