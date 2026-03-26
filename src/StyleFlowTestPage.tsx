import { useState, useMemo } from 'react';
import { StyleFlowStateMachine } from './style-flow/journey';
import { StyleFlowShell } from './style-flow/components/StyleFlowShell';

export default function StyleFlowTestPage() {
  const machine = useMemo(() => new StyleFlowStateMachine('test-' + Date.now()), []);
  const [show, setShow] = useState(true);

  return (
    <div style={{ background: '#111', minHeight: '100vh' }}>
      {!show && (
        <button
          onClick={() => setShow(true)}
          style={{ margin: 20, padding: '8px 16px', background: '#06b6d4', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Open Style Flow
        </button>
      )}
      {show && <StyleFlowShell machine={machine} onClose={() => setShow(false)} />}
    </div>
  );
}
