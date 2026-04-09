import { renderHook, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { openBISHookFactory } from "../hooks/auth/useAuth";
import { storageMockFactory } from "./storageMock";
import { beforeEach } from "vitest";

const url = "http://localhost:8082/openbis";
const apiFacade = openBISHookFactory(url);

const username = "admin";
const password = "mysecretpassword";

vi.doMock("localStorage", storageMockFactory);

beforeEach(() => {
  localStorage.clear();
});

test("initially logged out", async () => {
  const { result } = renderHook(() => apiFacade());
  await waitFor(() => {
    expect(result.current.apiFacade).toBeDefined();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

test("login succeeds", async (act) => {
  const { result } = renderHook(() => apiFacade());
  await waitFor(() => {
    expect(result.current.apiFacade).toBeDefined();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
  const loginResult = await result.current.login(username, password);
  await waitFor(() => {
    expect(result.current.apiFacade).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
    expect(loginResult).toEqual(result.current.token);
  });
});

test("two hook instances give the same token", async (act) => {
  const { result } = renderHook(() => apiFacade());
  await result.current.login(username, password);
  const render1 = renderHook(() => apiFacade());
  await waitFor(() => {
    expect(render1.result.current.isAuthenticated).toBeTruthy();
    expect(render1.result.current.token).toEqual(result.current.token);
  });
});
