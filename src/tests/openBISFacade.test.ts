import { expect, test, vi } from "vitest";
import { OpenBISApiFacade } from "../hooks/auth/useAuth";
import openbis from "@openbis/openbis.esm";

const facade = OpenBISApiFacade.getInstance("http://localhost:8082/openbis");

test("login", async () => {
  const loggedIn = await facade.login("admin", "mysecretpassword");
  expect(loggedIn).toBeDefined();
});
