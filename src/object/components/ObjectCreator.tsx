import React, { useContext, useState } from 'react';
import { Form, Button, Container } from 'react-bootstrap';
import { LoginContext } from '../../auth/LoginContext';
import { useCreateObject } from '../api/useCreateObject';
import { useSearchObjectTypes } from '../api/useSearchObjectTypes';
import AutoCompleteDropDown from '../../components/AutoCompleteDropdown';

export const ObjectCreator = () => {
    const { apiFacade } = useContext(LoginContext);
    
    const createMutation = useCreateObject();
    const [searchTerm, setSearchTerm] = useState("");
    // const [ data, error, isLoading ]= useSearchObjectTypes(searchTerm);
  

    const onObjectTypeTyping = (event: React.ChangeEvent<HTMLInputElement>) => {
        const type = event.target.value;
        setSearchTerm(type);
        
    }

    const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const formValues = form.elements as typeof form.elements & {
            objectName: { value: string };
            objectDescription: { value: string };
            objectLocation: { value: string };
        };
        createMutation.mutate({
            type: formValues.objectName.value,
            location: formValues.objectLocation.value,
            props: { description: formValues.objectDescription.value }
        });
    }

    return (
        <Container>
                <AutoCompleteDropDown label='' onSelect={()=>{}} onType={(val)=>{return  [val, "c"]}}/>
            {/* <h1>Create Object</h1>
            <Form onSubmit={onSubmit}>
                <Form.Group controlId="objectName">
                    <Form.Label>Object Name</Form.Label>
                    <Form.Control type="text" placeholder="Enter object name" />
                </Form.Group>
                <Form.Group controlId="objectDescription" className="mt-3">
                    <Form.Label>Object Description</Form.Label>
                    <Form.Control type="text" placeholder="Enter object description" />
                </Form.Group>
                <Form.Group controlId="objectLocation" className="mt-3">
                    <Form.Label>Object Location</Form.Label>
                    <Form.Control type="text" placeholder="Enter object location" />
                </Form.Group>
                <Button variant="primary" type="submit" className="mt-3">
                    Create Object
                </Button>
            </Form> */}
        </Container>
    );
}