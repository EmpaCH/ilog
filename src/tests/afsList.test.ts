import { describe, expect, test } from "vitest";
import { parseAfsListOctetStream } from "../apis/dataset/helpersDatasetAPI";

describe("parseAfsListOctetStream", () => {
  test("reads tab-separated records", () => {
    // As returned by the AFS list method on openBIS dev000
    const text =
      "20261118133950517-510\t/RSE_poster_intake_groups.pptx\tRSE_poster_intake_groups.pptx\tfalse\t51527\t1795005596475\n" +
      "20261118133950517-510\t/graphical_abstract-10.png\tgraphical_abstract-10.png\tfalse\t416686\t1795431009349";

    expect(parseAfsListOctetStream(text)).toEqual([
      {
        path: "/graphical_abstract-10.png",
        name: "graphical_abstract-10.png",
        directory: false,
        size: 416686,
        lastModified: 1795431009349,
      },
      {
        path: "/RSE_poster_intake_groups.pptx",
        name: "RSE_poster_intake_groups.pptx",
        directory: false,
        size: 51527,
        lastModified: 1795005596475,
      },
    ]);
  });

  test("keeps commas in tab-separated file names", () => {
    const text = "owner-1\t/a, b.txt\ta, b.txt\tfalse\t1\t1700000000000";
    expect(parseAfsListOctetStream(text).map((e) => e.name)).toEqual(["a, b.txt"]);
  });

  test("lists folders before files", () => {
    const text = "o\t/data/x.txt\tx.txt\tfalse\t1\t1\no\t/data\tdata\ttrue\t0\t1";
    expect(parseAfsListOctetStream(text).map((e) => [e.path, e.directory])).toEqual([
      ["/data", true],
      ["/data/x.txt", false],
    ]);
  });

  test("still reads comma-separated records of older builds, skipping the header", () => {
    const text = "owner,path,name,directory,size,lastModified\n20250101-1,/a.pdf,a.pdf,false,10,1700000000000\n";
    expect(parseAfsListOctetStream(text)).toEqual([
      { path: "/a.pdf", name: "a.pdf", directory: false, size: 10, lastModified: 1700000000000 },
    ]);
  });

  test("returns an empty list for an empty response", () => {
    expect(parseAfsListOctetStream("")).toEqual([]);
  });
});
