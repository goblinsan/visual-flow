# Command Pattern Integration Guide

## Overview

Phase 0 introduces a command pattern for all spec mutations to enable future undo/redo functionality and ensure consistent state management.

## Architecture

### Command Interface

All commands implement the `Command` interface from `src/commands/types.ts`:

```typescript
export interface Command {
  id: string;                    // Unique command identifier
  description?: string;          // Human-readable description
  apply(ctx: CommandContext): LayoutSpec;  // Execute the command
  invert?(before: LayoutSpec, after: LayoutSpec): Command | null;  // Optional inverse
}
```

### Command Context

Commands receive a `CommandContext` with the current state:

```typescript
export interface CommandContext {
  spec: LayoutSpec;      // Current spec before command execution
  selection: string[];   // Currently selected node IDs
}
```

## Available Commands

### 1. UpdateNodePropsCommand
Updates properties on a single node.

```typescript
import { createUpdateNodePropsCommand } from './commands';

const command = createUpdateNodePropsCommand({
  id: 'node-123',
  props: { fill: '#ff0000', opacity: 0.8 }
});
```

### 2. DeleteNodesCommand
Removes nodes from the spec.

```typescript
import { createDeleteNodesCommand } from './commands';

const command = createDeleteNodesCommand({
  ids: ['node-1', 'node-2']
});
```

### 3. DuplicateNodesCommand
Creates copies of existing nodes.

```typescript
import { createDuplicateNodesCommand } from './commands';

const command = createDuplicateNodesCommand({
  ids: ['node-1']
});
```

### 4. GroupNodesCommand
Groups multiple nodes into a single group node.

```typescript
import { createGroupNodesCommand } from './commands';

const command = createGroupNodesCommand({
  ids: ['node-1', 'node-2']
});
```

### 5. UngroupNodeCommand
Ungroups a group node, promoting children to parent.

```typescript
import { createUngroupNodeCommand } from './commands';

const command = createUngroupNodeCommand({
  id: 'group-123'
});
```

### 6. TransformNodesCommand
Updates position, size, rotation, or scale of nodes.

```typescript
import { createTransformNodesCommand } from './commands';

const command = createTransformNodesCommand({
  updates: [
    { id: 'node-1', position: { x: 100, y: 200 } },
    { id: 'node-2', size: { width: 300, height: 200 } }
  ]
});
```

## Using Commands

### With useCommandExecutor Hook

The `useCommandExecutor` hook provides a convenient way to execute commands:

```typescript
import { useCommandExecutor, createUpdateNodePropsCommand } from './commands';

function MyComponent({ spec, setSpec, selection }) {
  const { execute } = useCommandExecutor(spec, selection, setSpec);
  
  const handleUpdate = () => {
    const command = createUpdateNodePropsCommand({
      id: 'node-1',
      props: { fill: '#00ff00' }
    });
    execute(command);
  };
  
  return <button onClick={handleUpdate}>Update Color</button>;
}
```

### Direct Execution

You can also execute commands directly:

```typescript
import { createDeleteNodesCommand } from './commands';
import type { CommandContext } from './commands/types';

const ctx: CommandContext = { spec, selection };
const command = createDeleteNodesCommand({ ids: ['node-1'] });
const newSpec = command.apply(ctx);
setSpec(newSpec);
```

## Command Inversion

Commands support optional inversion for undo/redo:

```typescript
const command = createUpdateNodePropsCommand({
  id: 'node-1',
  props: { fill: '#ff0000' }
});

const beforeSpec = spec;
const afterSpec = command.apply({ spec, selection });

// Get inverse command (if supported)
const inverseCommand = command.invert?.(beforeSpec, afterSpec);

if (inverseCommand) {
  // Execute inverse to undo
  const undoneSpec = inverseCommand.apply({ spec: afterSpec, selection });
}
```

## Migration Path

### Current State
- Commands are implemented and tested
- `useCommandExecutor` hook provides execution infrastructure
- CanvasStage uses direct spec mutations (legacy)

### Future Enhancements
1. **History Stack** (Milestone 3)
   - Add `useHistory` hook with undo/redo
   - Track command history with inversion
   - Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

2. **Batch Commands** (Milestone 4)
   - Group related commands (e.g., drag operations)
   - Single undo step for grouped actions

3. **Command Persistence** (Milestone 5)
   - Serialize commands to session storage
   - Crash recovery with command replay

## Testing

All commands have comprehensive test coverage:

```bash
npm test src/commands/
```

Test files follow the pattern `<command-name>.test.ts` and cover:
- Basic command execution
- Inversion/undo behavior
- Edge cases (empty selections, invalid IDs, etc.)

## Best Practices

1. **Use Commands for All Mutations**
   - Never mutate spec directly
   - Use appropriate command for the operation

2. **Provide Descriptive IDs**
   - Use meaningful command descriptions
   - Helps with debugging and history display

3. **Test Command Inversion**
   - Ensure inverse commands restore original state
   - Critical for undo/redo functionality

4. **Keep Commands Pure**
   - No side effects in command execution
   - Deterministic behavior given same context

## See Also

- [Commands Source](../src/commands/)
- [Command Tests](../src/commands/*.test.ts)
- [Roadmap - Milestone 2](./ROADMAP.md#milestone-2-command-dispatch-layer)
