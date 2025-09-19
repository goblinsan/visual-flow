import { render, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { useRecentColors } from '../hooks/useRecentColors';

function Harness() {
  const { recentColors, beginSession, previewColor, commitColor } = useRecentColors();
  const [value, setValue] = useState('#123456');
  return (
    <div>
      <input
        data-testid="picker"
        type="color"
        value={value}
        onPointerDown={() => beginSession(value)}
        onInput={e => { setValue(e.currentTarget.value); previewColor(e.currentTarget.value); }}
        onChange={e => { previewColor(e.currentTarget.value); }}
        onBlur={e => { commitColor(e.currentTarget.value); }}
      />
      <ul data-testid="recent">
        {recentColors.map(c => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}

describe('color picker session integration', () => {
  it('commits only final color after multiple inputs', () => {
    const { getByTestId } = render(<Harness />);
    const picker = getByTestId('picker') as HTMLInputElement;
    fireEvent.pointerDown(picker);
    fireEvent.input(picker, { target: { value: '#111111' } });
    fireEvent.input(picker, { target: { value: '#222222' } });
    fireEvent.change(picker, { target: { value: '#222222' } });
    fireEvent.blur(picker, { target: { value: '#222222' } });
    const recent = getByTestId('recent');
    expect(recent.textContent?.includes('#222222')).toBe(true);
    expect(recent.textContent?.includes('#111111')).toBe(false);
  });

  it('skips commit when final color equals base', () => {
    const { getByTestId } = render(<Harness />);
    const picker = getByTestId('picker') as HTMLInputElement;
    fireEvent.pointerDown(picker);
    // no change
    fireEvent.blur(picker, { target: { value: '#123456' } });
    const recent = getByTestId('recent');
    // base color not added because unchanged (recent list starts with defaults #ffffff/#000000 only)
    expect(recent.textContent?.includes('#123456')).toBe(false);
  });
});
