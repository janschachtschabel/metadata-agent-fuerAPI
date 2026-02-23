import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VocabularyConcept } from '../../../shared/models/canvas.models';

export interface TreeNode {
  concept: VocabularyConcept;
  children: TreeNode[];
  expanded: boolean;
  visible: boolean;
  matchesFilter: boolean;
  depth: number;
}

@Component({
  selector: 'app-vocab-tree-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './vocab-tree-picker.component.html',
  styleUrls: ['./vocab-tree-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VocabTreePickerComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() concepts: VocabularyConcept[] = [];
  @Input() hierarchical = false;
  @Input() multiple = false;
  @Input() selectedValues: string[] = [];
  @Input() open = false;

  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('filterInput') filterInput?: any;

  filterText = '';
  treeNodes: TreeNode[] = [];
  flatVisibleNodes: TreeNode[] = [];
  panelStyle: Record<string, string> = {};
  private needsFocus = false;

  constructor(private cdr: ChangeDetectorRef, private elRef: ElementRef) {}

  ngAfterViewChecked(): void {
    if (this.needsFocus && this.filterInput) {
      const el = this.filterInput._elementRef?.nativeElement || this.filterInput.nativeElement;
      if (el) {
        setTimeout(() => el.focus(), 0);
      }
      this.needsFocus = false;
    }
  }

  ngOnInit(): void {
    this.buildTree();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['concepts'] || changes['hierarchical']) {
      this.buildTree();
    }
    if (changes['open'] && this.open) {
      this.filterText = '';
      this.applyFilter();
      this.updatePanelPosition();
      this.needsFocus = true;
    }
  }

  private buildTree(): void {
    if (!this.concepts?.length) {
      this.treeNodes = [];
      this.flatVisibleNodes = [];
      return;
    }

    if (this.hierarchical) {
      this.treeNodes = this.buildHierarchicalTree();
    } else {
      this.treeNodes = this.concepts.map(c => ({
        concept: c,
        children: [],
        expanded: false,
        visible: true,
        matchesFilter: true,
        depth: 0
      }));
    }

    this.updateFlatList();
  }

  private buildHierarchicalTree(): TreeNode[] {
    const uriMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create all nodes first
    for (const concept of this.concepts) {
      const node: TreeNode = {
        concept,
        children: [],
        expanded: false,
        visible: true,
        matchesFilter: true,
        depth: 0
      };
      if (concept.uri) {
        uriMap.set(concept.uri, node);
      }
    }

    // Build parent-child relationships
    for (const concept of this.concepts) {
      const node = concept.uri ? uriMap.get(concept.uri) : undefined;
      if (!node) continue;

      if (concept.broader) {
        const parent = uriMap.get(concept.broader);
        if (parent) {
          parent.children.push(node);
          continue;
        }
      }
      roots.push(node);
    }

    // Set depth recursively
    const setDepth = (nodes: TreeNode[], depth: number) => {
      for (const node of nodes) {
        node.depth = depth;
        setDepth(node.children, depth + 1);
      }
    };
    setDepth(roots, 0);

    return roots;
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  clearFilter(): void {
    this.filterText = '';
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.filterText.toLowerCase().trim();

    if (!term) {
      // Show all, collapse all
      const resetVisibility = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          node.visible = true;
          node.matchesFilter = true;
          node.expanded = false;
          resetVisibility(node.children);
        }
      };
      resetVisibility(this.treeNodes);
    } else {
      // Mark matches and expand ancestors
      const filterNodes = (nodes: TreeNode[]): boolean => {
        let anyVisible = false;
        for (const node of nodes) {
          const label = (typeof node.concept.label === 'string'
            ? node.concept.label
            : '').toLowerCase();
          const altMatch = (node.concept.altLabels || [])
            .some(alt => alt.toLowerCase().includes(term));
          const directMatch = label.includes(term) || altMatch;

          const childrenVisible = filterNodes(node.children);

          node.matchesFilter = directMatch;
          node.visible = directMatch || childrenVisible;
          node.expanded = childrenVisible && !directMatch ? true : node.expanded;

          if (node.visible) anyVisible = true;
        }
        return anyVisible;
      };
      filterNodes(this.treeNodes);
    }

    this.updateFlatList();
    this.cdr.markForCheck();
  }

  private updateFlatList(): void {
    this.flatVisibleNodes = [];
    const collect = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (!node.visible) continue;
        this.flatVisibleNodes.push(node);
        if (node.expanded && node.children.length > 0) {
          collect(node.children);
        }
      }
    };
    collect(this.treeNodes);
  }

  toggleExpand(node: TreeNode, event: Event): void {
    event.stopPropagation();
    node.expanded = !node.expanded;
    this.updateFlatList();
    this.cdr.markForCheck();
  }

  isSelected(node: TreeNode): boolean {
    const val = node.concept.uri || node.concept.label;
    return this.selectedValues.includes(val as string);
  }

  toggleSelection(node: TreeNode): void {
    const val = (node.concept.uri || node.concept.label) as string;

    let newSelection: string[];
    if (this.multiple) {
      if (this.selectedValues.includes(val)) {
        newSelection = this.selectedValues.filter(v => v !== val);
      } else {
        newSelection = [...this.selectedValues, val];
      }
    } else {
      if (this.selectedValues.includes(val)) {
        newSelection = [];
      } else {
        newSelection = [val];
      }
    }

    this.selectionChange.emit(newSelection);
  }

  close(): void {
    this.closed.emit();
  }

  private updatePanelPosition(): void {
    const el = this.elRef.nativeElement as HTMLElement;
    // Walk up to find the field container as position anchor
    const anchor = el.closest('.canvas-field') as HTMLElement
                || el.closest('mat-form-field') as HTMLElement
                || el.parentElement;

    if (!anchor) {
      // Fallback: center in viewport
      this.panelStyle = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px'
      };
      this.cdr.markForCheck();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const panelMaxHeight = 360;
    const panelWidth = Math.min(Math.max(rect.width, 360), 500);

    // Position below the field; if not enough space, position above
    let top = rect.bottom + 4;
    if (top + panelMaxHeight > viewportHeight && rect.top > panelMaxHeight) {
      top = rect.top - panelMaxHeight - 4;
    }
    // Clamp to viewport
    top = Math.max(8, Math.min(top, viewportHeight - panelMaxHeight - 8));

    // Horizontal: align to field left, but clamp to viewport
    let left = rect.left;
    if (left + panelWidth > viewportWidth - 8) {
      left = viewportWidth - panelWidth - 8;
    }
    left = Math.max(8, left);

    this.panelStyle = {
      top: `${top}px`,
      left: `${left}px`,
      width: `${panelWidth}px`
    };
    this.cdr.markForCheck();
  }

  trackByUri(_: number, node: TreeNode): string {
    return (node.concept.uri || node.concept.label) as string;
  }
}
