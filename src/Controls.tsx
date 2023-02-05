import React from 'react';
import styled from 'styled-components';
import { clsx } from './tools';

const ControlsDiv = styled.div`
  border: 1px solid #999;
  border-radius: 4px;
  display: flex;
  background-color: #fff;
  box-shadow: 0 2px 8px 2px rgba(0, 0, 0, 0.2);
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1em;
  box-sizing: border-box;

  &.error {
    background-color: #f5371d;
  }
`;

const Input = styled.input`
  border: none;
  border-bottom: 1px solid #999;
  background-color: transparent;
  outline: none;
  width: 100px;

  &:focus {
    color: #6b22f2;
    border-color: #6b22f2;
  }

  .error & {
    color: #fff;
    border-color: #fff;
  }
`;

const Button = styled.button`
  cursor: pointer;
  padding: 1em;
  box-sizing: border-box;
  min-width: 100px;
  background-color: unset;
  border: unset;
  border-left: 1px solid #999;

  &:hover {
    background-color: rgba(230, 230, 230, 0.5);
  }

  z-index: 1;
`;

const ButtonContainer = styled.div`
  position: relative;
  display: flex;
`;

const LoadingIndicator = styled.div`
  position: absolute;
  left: 0;
  height: 100%;
  background-color: #6b22f2;
  pointer-events: none;
`;

export interface ControlsProps {
  className?: string;
  pickCount: number;
  setPickCount: (pickCount: number) => unknown;
  onClickGenerate: () => unknown;
  onClickCancel: () => unknown;
  onClickReset: () => unknown;
  loading: number | null;
}

const Controls: React.FC<ControlsProps> = ({
  className,
  pickCount,
  setPickCount,
  onClickGenerate,
  onClickCancel,
  onClickReset,
  loading,
}) => {
  const [error, setError] = React.useState(false);
  const [wip, setWip] = React.useState(pickCount.toString());

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const isLoading = loading !== null;

  function handleClick() {
    if (isLoading) {
      onClickCancel();
    } else {
      onClickGenerate();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { value } = e.target;
    setWip(value);

    if (!isValid(value)) {
      setError(true);
    } else {
      setError(false);
    }
  }

  function handleBlur() {
    if (isValid(wip)) {
      setPickCount(Number(wip));
    } else {
      setWip(pickCount.toString());
      setError(false);
    }
  }

  function isValid(value: string): boolean {
    const count = Number(value);
    return /^\d+$/.test(value.trim()) && !isNaN(count) && Number(count) > 0;
  }

  function handleDown(e: React.PointerEvent) {
    e.stopPropagation();
  }

  function focusInput() {
    inputRef.current?.focus();
  }

  return (
    <ControlsDiv className={className} onPointerDown={handleDown}>
      <InputContainer className={clsx({ error })} onClick={focusInput}>
        <Input
          ref={inputRef}
          disabled={isLoading}
          value={wip}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Pick Count"
        />
      </InputContainer>

      <ButtonContainer>
        {isLoading && <LoadingIndicator style={{ width: `${loading}%` }} />}

        <Button onClick={handleClick}>{loading ? 'Cancel' : 'Generate'}</Button>
      </ButtonContainer>

      <Button onClick={onClickReset}>Reset</Button>
    </ControlsDiv>
  );
};

export default Controls;
