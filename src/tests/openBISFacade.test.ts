import { expect, test, vi } from "vitest";
import { OpenBISApiFacade } from "../hooks/auth/useAuth";
import openbis from "@openbis/openbis.esm";

const asUrl = "http://localhost:8082/openbis"
const afsUrl = "http://localhost:8082/afs";

const facade = OpenBISApiFacade.getInstance(asUrl, afsUrl);

test("login", async () => {
  const loggedIn = await facade.login("admin", "mysecretpassword");
  expect(loggedIn).toBeDefined();
});
