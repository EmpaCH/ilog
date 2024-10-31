import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Divider } from '@nextui-org/react';
import { AuthContext } from '../../context/auth/authContext';
import { useCreateObject } from '../../apis/object/useCreate';
import { Autocomplete, AutocompleteItem } from "@nextui-org/react";
import { getTypes } from '../../apis/type/typeAPI';

export const ObjectCreator = () => {
  const { apiFacade } = useContext(AuthContext);
  const objectCreation = useCreateObject();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [messageColor, setMessageColor] = useState('rgb(23, 201, 100)');

  const types = useQuery({
    queryKey: ['getSampleTypes'],
    queryFn: async () => {
      return getTypes(apiFacade, searchTerm);
    },
  });

  useEffect(() => { 
    types.refetch();
  }, [searchTerm]);

  const onSubmitObject = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowMessage(false);
    setLoading(true);
    objectCreation.mutate({
      name: name,
      type: searchTerm,
      location: '',
      props: { description: '' }
    }, {
      onError: (err) => {
        setMessage(err.message.split(" (Context:")[0]);
        setMessageColor('rgb(243, 18, 96)');
        setShowMessage(true);
        setLoading(false);
      },
      onSuccess: () => {
        setMessage('Object created successfully!');
        setMessageColor('rgb(23, 201, 100)');
        setShowMessage(true);
        onClear(2000);
      },
    });
  }

  const onBack = () => {
    navigate({ to: '/objects' })
  };

  const onClear = (ms: number) => {
    setName('');
    setSearchTerm('');
    setLoading(false);
    setTimeout(() => {
      setMessage('');
      setShowMessage(false);
      }, ms);
  };

  return (
    <div className="md-size-div">
      <h2>Create Object</h2>
      <form onSubmit={onSubmitObject}>
        <Input
          isRequired
          id="name"
          label="Name"
          type="text"
          className="form-field"
          value={name}
          onValueChange={value => setName(value)}
        />
        <Autocomplete
          isRequired
          id="type"
          label="Type"
          placeholder="Type to search..."
          className="form-field"
          defaultItems={[]}
          items={types.data}
          inputValue={searchTerm}
          onInputChange={value => setSearchTerm(value)}
        >
          {(type) => <AutocompleteItem key={type.getCode()}>{type.getCode()}</AutocompleteItem>}
        </Autocomplete>
        <Divider className="my-4" />
        {showMessage && (
          <div style={{ marginBottom: "15px", color: messageColor }}>
            {message}
          </div>
        )}
        <div className="items-center">
          <Button
            type="button"
            color="default"
            className="mx-2"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            color="danger"
            className="mx-2"
            onClick={() => onClear(0)}
          >
            Clear
          </Button>
          <Button
            type="submit"
            color="primary"
            className="mx-2"
            isLoading={loading}
          >
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}
