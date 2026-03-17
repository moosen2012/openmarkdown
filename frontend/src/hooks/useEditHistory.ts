export interface HistoryState {
    content: string;
    cursorPosition: number;
    timestamp: number;
}

interface EditHistory {
    past: HistoryState[];
    present: HistoryState;
    future: HistoryState[];
}

export class EditHistoryManager {
    private history: EditHistory;
    private maxHistorySize: number = 50;

    constructor(initialContent: string = '') {
        const initialState: HistoryState = {
            content: initialContent,
            cursorPosition: 0,
            timestamp: Date.now(),
        };
        this.history = {
            past: [],
            present: initialState,
            future: [],
        };
    }

    recordChange(newContent: string, cursorPosition: number): void {
        if (newContent === this.history.present.content) {
            return;
        }

        const newState: HistoryState = {
            content: newContent,
            cursorPosition,
            timestamp: Date.now(),
        };

        this.history = {
            past: [...this.history.past, this.history.present].slice(-this.maxHistorySize),
            present: newState,
            future: [],
        };
    }

    undo(): HistoryState | null {
        if (this.history.past.length === 0) return null;

        const previous = this.history.past[this.history.past.length - 1];
        const newPast = this.history.past.slice(0, -1);

        this.history = {
            past: newPast,
            present: previous,
            future: [this.history.present, ...this.history.future],
        };

        return previous;
    }

    redo(): HistoryState | null {
        if (this.history.future.length === 0) return null;

        const next = this.history.future[0];
        const newFuture = this.history.future.slice(1);

        this.history = {
            past: [...this.history.past, this.history.present],
            present: next,
            future: newFuture,
        };

        return next;
    }

    canUndo(): boolean {
        return this.history.past.length > 0;
    }

    canRedo(): boolean {
        return this.history.future.length > 0;
    }

    getCurrentState(): HistoryState {
        return this.history.present;
    }

    reset(content: string = ''): void {
        const initialState: HistoryState = {
            content,
            cursorPosition: 0,
            timestamp: Date.now(),
        };
        this.history = {
            past: [],
            present: initialState,
            future: [],
        };
    }
}
