import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, Textarea, Divider } from '@nextui-org/react';
import { useCreateType } from '../../apis/type/useCreate';

export const TypeCreator = () => {
  const typeCreation = useCreateType();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [prefix, setPrefix] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [messageColor, setMessageColor] = useState('rgb(23, 201, 100)');

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowMessage(false);
    setLoading(true);
    typeCreation.mutate({
      code: code,
      prefix: prefix.length > 0 ? prefix : code,
      description: description,
    }, {
      onError: (err) => {
        setMessage(err.message.split(" (Context:")[0]);
        setMessageColor('rgb(243, 18, 96)');
        setShowMessage(true);
        setLoading(false);
      },
      onSuccess: () => {
        setMessage('Type created successfully!');
        setMessageColor('rgb(23, 201, 100)');
        setShowMessage(true);
        onClear(2000);
      },
    });
  };

  const onBack = () => {
    navigate({ to: '/types' })
  };

  const onClear = (ms: number) => {
    setCode('');
    setPrefix('');
    setDescription('');
    setLoading(false);
    setTimeout(() => {
      setMessage('');
      setShowMessage(false);
      }, ms);
  };

  return (
    <div className="md-size-div">
      <h2>Create Type</h2>
      <form onSubmit={handleSubmit}>
        <Input
          isRequired
          id="code"
          label="Code"
          type="text"
          className="form-field"
          value={code}
          onValueChange={value => setCode(value)}
        />
        <Input
          id="prefix"
          label="Prefix"
          placeholder="Enter type prefix: If left empty then the code itself will be used as a prefix"
          type="text"
          className="form-field"
          value={prefix}
          onValueChange={value => setPrefix(value)}
        />
        <Textarea
          id="description"
          label="Description"
          className="form-field"
          value={description}
          onValueChange={value => setDescription(value)}
        />
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
