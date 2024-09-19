import React from "react";
import { useState } from "react";
import { Dropdown, Form } from "react-bootstrap";

interface AutoCompleteDropDownProps {
  label: string;
  onType: (value: string) => string[];
  onSelect: (value: string) => void;
}

const AutoCompleteDropDown = ({
  label,
  onType,
  onSelect,
}: AutoCompleteDropDownProps) => {
  const [choices, setChoices] = useState<string[]>(["a", "b", "c"]);

  function triggerAutoComplete(event: React.ChangeEvent<HTMLInputElement>) {
    const choices = onType(event.target.value);
    console.log(choices);
    setChoices((old)=> [...old,  ...choices]);
  }
  return (
    <>
      <Form.Label id="objectTypeLabel">{label}</Form.Label>
      <Form.Control
        type="input"
        id="inputChoice"
        aria-describedby="objectTypeLabel"
        list="objectTypeChoices"
      />
      <Form.Text onChange={triggerAutoComplete} muted></Form.Text>
      <datalist id="objectTypeChoices">
        {choices.map((choice) => (
          <option key={choice} value={choice} />
        ))}
      </datalist>
    </>
  );
};

export default AutoCompleteDropDown;
