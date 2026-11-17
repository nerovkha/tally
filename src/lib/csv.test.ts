import { describe, expect, it } from "vitest";
import { centsToDecimal, csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("passes plain values through", () => {
    expect(csvCell("Rent")).toBe("Rent");
    expect(csvCell(42)).toBe("42");
  });

  it("renders empty values as empty cells", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes cells containing separators or quotes", () => {
    expect(csvCell("Dinner, drinks")).toBe('"Dinner, drinks"');
    expect(csvCell('Say "hey"')).toBe('"Say ""hey"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });
});

describe("toCsv", () => {
  it("builds crlf-terminated rows", () => {
    const csv = toCsv(
      ["Description", "Amount"],
      [
        ["Rent", 800],
        ["Dinner, drinks", "12.50"],
      ],
    );
    expect(csv).toBe(
      "Description,Amount\r\nRent,800\r\n\"Dinner, drinks\",12.50\r\n",
    );
  });
});

describe("centsToDecimal", () => {
  it("formats cents as a decimal string", () => {
    expect(centsToDecimal(80000)).toBe("800.00");
    expect(centsToDecimal(1255)).toBe("12.55");
  });
});
