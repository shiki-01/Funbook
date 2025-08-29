# Codebase Architecture

This document describes the new modular architecture implemented for the visual block editor application.

## Directory Structure

```
src/lib/
├── components/                 # UI Components (Presentation Layer)
│   ├── canvas/                 # Canvas-specific components
│   ├── blocks/                 # Block-specific components
│   ├── ui/                     # Reusable UI components
│   └── layout/                 # Layout components
├── services/                   # Business Logic Layer
│   ├── block/                  # Block operations
│   ├── canvas/                 # Canvas operations
│   ├── drag/                   # Drag & drop logic
│   └── project/                # Project management
├── stores/                     # State Management Layer
│   ├── block.store.svelte.ts   # Block state
│   ├── canvas.store.svelte.ts  # Canvas state
│   └── project.store.svelte.ts # Project state
├── types/                      # Type Definitions
│   ├── domain/                 # Domain types
│   ├── ui/                     # UI types
│   ├── services/               # Service interfaces
│   └── core/                   # Core types and enums
└── utils/                      # Pure Utilities
    ├── calculations/           # Mathematical operations
    ├── validation/             # Data validation
    └── helpers/                # Common helpers
```

## Architecture Principles

### 1. Separation of Concerns

- **Components**: Handle only UI rendering and user interactions
- **Services**: Contain business logic and domain operations
- **Stores**: Manage application state
- **Utils**: Provide pure, reusable functions

### 2. Type Safety

- Comprehensive TypeScript interfaces for all data structures
- Service contracts defined through interfaces
- Domain types separated from UI types

### 3. Testability

- Pure functions in utilities are easily testable
- Service interfaces allow for mocking
- Components receive data through props

### 4. Modularity

- Each module has a single responsibility
- Clear boundaries between layers
- Easy to extend and modify

## Type System

### Domain Types (`types/domain/`)

Core business logic types:

- `Block`: Complete block definition
- `BlockType`: Block template
- `Position`, `Size`: Basic geometric types
- `ProjectData`: Project structure

### UI Types (`types/ui/`)

User interface specific types:

- `CanvasState`: Canvas viewport and interaction state
- `DragState`: Drag and drop state
- `UIConfig`: UI configuration

### Service Interfaces (`types/services/`)

Contracts for business logic services:

- `IBlockService`: Block operations
- `ICanvasService`: Canvas operations
- `IDragService`: Drag and drop operations

## Utilities

### Calculations (`utils/calculations/`)

Pure mathematical functions:

- Position and distance calculations
- Geometric operations
- Coordinate transformations

### Validation (`utils/validation/`)

Data validation functions:

- Block validation
- Connection validation
- Input sanitization

### Helpers (`utils/helpers/`)

Common utility functions:

- ID generation
- Object manipulation
- String formatting

## Testing

The project uses Vitest for testing with the following setup:

- Unit tests for utilities and services
- Component tests for UI components
- Integration tests for service interactions

### Running Tests

```bash
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage
```

## Migration Strategy

This new architecture is designed to be implemented incrementally:

1. **Phase 1**: Foundation (Current)
   - New directory structure
   - Type definitions
   - Test infrastructure

2. **Phase 2**: Service Layer
   - Implement service interfaces
   - Extract business logic from components

3. **Phase 3**: Store Refactoring
   - Split monolithic store
   - Implement separated stores

4. **Phase 4**: Component Refactoring
   - Break down large components
   - Implement specialized components

5. **Phase 5**: Integration
   - Wire services with components
   - Performance optimizations

## Best Practices

### Component Development

- Keep components focused on rendering
- Use props for data input
- Emit events for user actions
- Avoid direct store access when possible

### Service Development

- Implement service interfaces
- Keep services stateless when possible
- Use dependency injection
- Handle errors appropriately

### Store Development

- Keep stores focused on specific domains
- Use reactive patterns
- Implement proper cleanup
- Maintain data consistency

### Utility Development

- Write pure functions
- Include comprehensive tests
- Document function behavior
- Handle edge cases

## Legacy Compatibility

The new type system includes backward compatibility exports to ensure existing code continues to work during the migration period. These will be gradually deprecated as the refactoring progresses.
