import React, { useState } from "react";
import { Button, Input } from "@heroui/react";
import SaveIcon from "@mui/icons-material/Save";

/*
  This component implements an accordion title that can be edited
*/
export interface EditableAccordionTitleProps {
  initialTitle: string;
  onChange: (newTitle: string) => void;
  locked: Boolean;
}

export const EditableAccordionTitle: React.FC<EditableAccordionTitleProps> = ({
  initialTitle,
  onChange,
  locked,
}) => {
  const [title, setTitle] = useState(initialTitle);
  return (
    <form>
      <Input
        isDisabled={locked}
        onChange={(event) => {
          event.preventDefault();
          setTitle(event.target.value);
        }}
        placeholder={title}
      />
      <Button isIconOnly onPress={()=> onChange(title)}> <SaveIcon/></Button>
    </form>
  );
};
