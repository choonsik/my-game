import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { CitySelect } from "@/app/_game/city-select";
import { cities } from "@/modules/city";

test("첫 화면은 도쿄, 뉴욕, 파리와 각 도시의 최고 기록 또는 기록 없음을 보여 준다", () => {
  render(
    <CitySelect
      cities={cities}
      bestTimes={{ tokyo: 65_300, "new-york": null, paris: null }}
      onSelect={vi.fn()}
    />
  );

  const items = within(screen.getByRole("list", { name: "도시 목록" })).getAllByRole("listitem");
  expect(items.map((item) => within(item).getByText(/도쿄|뉴욕|파리/).textContent)).toEqual([
    "도쿄",
    "뉴욕",
    "파리",
  ]);
  expect(within(items[0]).getByText("1:05.3")).toBeInTheDocument();
  expect(within(items[1]).getByText("기록 없음")).toBeInTheDocument();
});
