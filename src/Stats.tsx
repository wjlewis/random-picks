import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  border: 1px solid #999;
  border-radius: 4px;
  display: flex;
  background-color: #fff;
  box-shadow: 0 2px 8px 2px rgba(0, 0, 0, 0.2);
  padding: 1em;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FrontierSpan = styled.span`
  color: #ff4c33;
`;

export interface StatsProps {
  className?: string;
  picksCount: number;
  frontierSize: number;
}

const Stats: React.FC<StatsProps> = ({
  className,
  frontierSize,
  picksCount,
}) => {
  const frac = Number(frontierSize / picksCount).toPrecision(2);
  return (
    <Container className={className}>
      <FrontierSpan>{frontierSize}</FrontierSpan>
      <span>
        / {picksCount} ≈ {frac}
      </span>
    </Container>
  );
};

export default Stats;
