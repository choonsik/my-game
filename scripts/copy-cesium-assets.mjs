// CesiumJS는 실행 중에 Workers, Assets, Widgets, ThirdParty 파일을 URL로 불러온다.
// 패키지의 빌드 산출물을 public/cesium으로 복사해 CESIUM_BASE_URL("/cesium/")에서 제공한다.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const source = join("node_modules", "cesium", "Build", "Cesium");
const target = join("public", "cesium");
const version = JSON.parse(
  readFileSync(join("node_modules", "cesium", "package.json"), "utf8")
).version;
const stamp = join(target, ".version");

if (existsSync(stamp) && readFileSync(stamp, "utf8") === version) process.exit(0);

mkdirSync(target, { recursive: true });
for (const dir of ["Workers", "Assets", "Widgets", "ThirdParty"]) {
  cpSync(join(source, dir), join(target, dir), { recursive: true });
}
writeFileSync(stamp, version);
console.log(`copied cesium ${version} assets to ${target}`);
