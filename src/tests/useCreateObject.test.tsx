import {
  render,
  waitFor,
} from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useGetAllObjectTypes } from "../apis/type/useGetAllObjectTypes";
import userEvent from "@testing-library/user-event";
import { openBISHookFactory } from "../hooks/auth/useAuth";
import { useState } from "react";
import { storageMockFactory } from "./storageMock";
import { INSTRUMENT_TYPE_DEFINITION } from "../apis/shared/types";
import TestWrapper from "./TestWrapper";
import TestComponent from "./TestComponent";
import { useCreateObjectType } from "../apis/type/useCreateObjectType";

const url = "http://localhost:8082/openbis";
const apiFacade = openBISHookFactory(url);

vi.doMock("localStorage", storageMockFactory);

test("useCreateObjectType", async () => {
  const newCode = Math.random().toString(36).substring(7).toUpperCase();
  const DataComponent = () => {
    const [codes, setCodes] = useState<string[]>([]);
    const creation = useCreateObjectType();
    const objectTypes = useGetAllObjectTypes();
    const def = INSTRUMENT_TYPE_DEFINITION;
    def.code = newCode;

    const handleClick = async () => {
      await creation.mutateAsync({ definition: def });
      const res = await objectTypes.refetch();
      const newCodes = res.data?.map((it) => it.getCode());
      setCodes(newCodes);
    };

    return (
      <div>
        <h1>Test</h1>
        <button onClick={handleClick}>Create</button>
        <div aria-label="status">{creation.status}</div>
        <ul aria-label="objects">
          {codes.map((it) => (
            <li>{it}</li>
          ))}
        </ul>
      </div>
    );
  };

  const result = render(
    <TestComponent>
      <DataComponent />
    </TestComponent>,
    {
      wrapper: (children) =>
        TestWrapper({ children: children.children, apiFacade: apiFacade }),
    }
  );
  // User interactions
  await userEvent.click(result.getByRole("button", { name: "Login" }));
  await waitFor(() => {
    expect(result.getByText("Test")).toBeDefined();
  });
  await userEvent.click(result.getByRole("button", { name: "Create" }));
  // Assertions
  await waitFor(() => {
    expect(result.getByLabelText("status").textContent).toContain("success");
  });

  await waitFor(() => {
    expect(result.getByLabelText("objects").textContent).toContain(newCode);
  });
});
