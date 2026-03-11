import { BehaviorSubject } from 'rxjs';
import { CanvasState, createInitialState } from '../shared/models/canvas.models';

/**
 * Shared state container for a single instance.
 * Multiple CanvasComponent elements with the same instance ID
 * share one SharedInstanceState so their data stays in sync.
 */
export interface SharedInstanceState {
  stateSubject: BehaviorSubject<CanvasState>;
  fieldValueCache: Map<string, { values: Record<string, any>; origins: Record<string, boolean> }>;
  /** IDs of CanvasComponents currently bound to this instance */
  components: Set<string>;
  /** The component that emits DOM events (metadataChange, etc.) */
  primaryId: string | null;
}

/**
 * Static registry that manages per-instance shared state.
 *
 * - Different instance IDs → fully isolated state & events.
 * - Same instance ID     → shared state, only the *primary*
 *   component emits events (no duplicates).
 */
export class InstanceRegistry {
  private static instances = new Map<string, SharedInstanceState>();

  /** Get or lazily create the shared state for an instance. */
  static getOrCreate(instanceId: string): SharedInstanceState {
    if (!this.instances.has(instanceId)) {
      this.instances.set(instanceId, {
        stateSubject: new BehaviorSubject<CanvasState>(createInitialState()),
        fieldValueCache: new Map(),
        components: new Set(),
        primaryId: null,
      });
    }
    return this.instances.get(instanceId)!;
  }

  /**
   * Register a component for an instance.
   * @returns `true` if this component became the primary (event-emitter).
   */
  static register(instanceId: string, componentId: string): boolean {
    const inst = this.getOrCreate(instanceId);
    inst.components.add(componentId);
    if (!inst.primaryId) {
      inst.primaryId = componentId;
      return true;
    }
    return inst.primaryId === componentId;
  }

  /**
   * Unregister a component.  If it was primary, the next registered
   * component is automatically promoted.
   */
  static unregister(instanceId: string, componentId: string): void {
    const inst = this.instances.get(instanceId);
    if (!inst) return;
    inst.components.delete(componentId);
    if (inst.primaryId === componentId) {
      // Promote next component or clear
      const next = inst.components.values().next();
      inst.primaryId = next.done ? null : next.value;
    }
    // Clean up empty instances
    if (inst.components.size === 0) {
      this.instances.delete(instanceId);
    }
  }

  /** Check whether a component is the primary emitter for its instance. */
  static isPrimary(instanceId: string, componentId: string): boolean {
    const inst = this.instances.get(instanceId);
    if (!inst) return true; // no instance yet → treat as primary
    if (!inst.primaryId) {
      inst.primaryId = componentId;
      return true;
    }
    return inst.primaryId === componentId;
  }
}
