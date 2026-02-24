export interface LogEntry {
    type: 'created' | 'updated' | 'renamed' | 'removed';
    name: string;
    details?: string;
    timestamp: number;
}
