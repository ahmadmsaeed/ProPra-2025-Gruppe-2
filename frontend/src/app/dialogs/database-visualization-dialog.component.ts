import { Component, Inject, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import mermaid from 'mermaid';

import { SqlImportService } from '../services/sql-import.service';

export interface DatabaseVisualizationData {
  databaseId: number;
  databaseName: string;
}

@Component({
  selector: 'app-database-visualization-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatTabsModule,
    MatExpansionModule,
    MatChipsModule
  ],
  template: `
    <div class="visualization-dialog">
      <div mat-dialog-header>
        <h2 mat-dialog-title>
          <mat-icon>schema</mat-icon>
          Datenbank Visualisierung: {{ data.databaseName }}
        </h2>
        <button mat-icon-button (click)="onClose()" matTooltip="Schließen">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <div *ngIf="isLoading" class="loading-container">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Lade Datenbankstruktur...</p>
        </div>

        <div *ngIf="error" class="error-container">
          <mat-icon color="warn">error</mat-icon>
          <p>{{ error }}</p>
        </div>

        <div *ngIf="!isLoading && !error && databaseStructure" class="visualization-content">
          <mat-tab-group>
            <!-- ER Diagram Tab -->
            <mat-tab label="ER-Diagramm">
              <div class="tab-content">
                <div class="diagram-container">
                  <div #mermaidContainer class="mermaid-diagram"></div>
                </div>
                
                <div class="diagram-controls">
                  <button mat-button color="primary" (click)="refreshDiagram()" matTooltip="Diagramm neu laden">
                    <mat-icon>refresh</mat-icon>
                    Neu laden
                  </button>
                  <button mat-button color="accent" (click)="downloadDiagram()" matTooltip="Diagramm herunterladen">
                    <mat-icon>download</mat-icon>
                    Herunterladen
                  </button>
                </div>
              </div>
            </mat-tab>

            <!-- Structure Details Tab -->
            <mat-tab label="Struktur Details">
              <div class="tab-content">
                <div class="structure-details">
                  <h3>Tabellen ({{ databaseStructure.structure.tables.length }})</h3>
                  
                  <mat-accordion>
                    <mat-expansion-panel *ngFor="let table of databaseStructure.structure.tables">
                      <mat-expansion-panel-header>
                        <mat-panel-title>
                          <strong>{{ table.name }}</strong>
                          <mat-chip *ngIf="table.primaryKeys.length > 0" color="primary" selected>
                            PK: {{ table.primaryKeys.join(', ') }}
                          </mat-chip>
                        </mat-panel-title>
                      </mat-expansion-panel-header>
                      
                      <div class="table-details">
                        <h4>Spalten ({{ table.columns.length }})</h4>
                        <div class="columns-list">
                          <div *ngFor="let column of table.columns" class="column-item">
                            <div class="column-header">
                              <span class="column-name">{{ column.name }}</span>
                              <span class="column-type">{{ column.type }}</span>
                              <mat-chip *ngIf="column.isPrimary" color="primary" selected>PK</mat-chip>
                              <mat-chip *ngIf="!column.isNullable" color="warn" selected>NOT NULL</mat-chip>
                            </div>
                            <div *ngIf="column.constraints" class="column-constraints">
                              {{ column.constraints }}
                            </div>
                          </div>
                        </div>
                        
                        <div *ngIf="table.foreignKeys.length > 0" class="foreign-keys">
                          <h4>Fremdschlüssel ({{ table.foreignKeys.length }})</h4>
                          <div *ngFor="let fk of table.foreignKeys" class="fk-item">
                            <mat-icon>link</mat-icon>
                            <span>{{ fk.column }} → {{ fk.referencesTable }}.{{ fk.referencesColumn }}</span>
                          </div>
                        </div>
                      </div>
                    </mat-expansion-panel>
                  </mat-accordion>
                </div>
              </div>
            </mat-tab>

            <!-- Relationships Tab -->
            <mat-tab label="Beziehungen">
              <div class="tab-content">
                <div class="relationships-details">
                  <h3>Beziehungen ({{ databaseStructure.structure.relationships.length }})</h3>
                  
                  <div *ngIf="databaseStructure.structure.relationships.length === 0" class="no-relationships">
                    <mat-icon>info</mat-icon>
                    <p>Keine Beziehungen zwischen Tabellen gefunden.</p>
                  </div>
                  
                  <div *ngIf="databaseStructure.structure.relationships.length > 0" class="relationships-list">
                    <mat-card *ngFor="let rel of databaseStructure.structure.relationships" class="relationship-card">
                      <mat-card-header>
                        <mat-card-title>
                          <mat-icon>link</mat-icon>
                          {{ rel.from }} → {{ rel.to }}
                        </mat-card-title>
                        <mat-card-subtitle>
                          Fremdschlüssel Beziehung
                        </mat-card-subtitle>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="relationship-details">
                          <p><strong>Von:</strong> {{ rel.from }}.{{ rel.fromColumn }}</p>
                          <p><strong>Zu:</strong> {{ rel.to }}.{{ rel.toColumn }}</p>
                          <p><strong>Typ:</strong> {{ rel.type }}</p>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onClose()">Schließen</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .visualization-dialog {
      min-width: 800px;
      max-width: 1200px;
      max-height: 90vh;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      gap: 1rem;
    }

    .error-container {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      color: #f44336;
    }

    .visualization-content {
      padding: 1rem 0;
    }

    .tab-content {
      padding: 1rem 0;
    }

    .diagram-container {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1rem;
      background: #fafafa;
      min-height: 400px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .mermaid-diagram {
      width: 100%;
      text-align: center;
    }

    .diagram-controls {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      justify-content: center;
    }

    .structure-details h3 {
      margin-bottom: 1rem;
      color: #1976d2;
    }

    .table-details h4 {
      margin: 1rem 0 0.5rem 0;
      color: #424242;
    }

    .columns-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .column-item {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 0.5rem;
      background: #fafafa;
    }

    .column-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .column-name {
      font-weight: bold;
      color: #1976d2;
    }

    .column-type {
      font-family: 'Roboto Mono', monospace;
      background: #e3f2fd;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-size: 0.9em;
    }

    .column-constraints {
      margin-top: 0.5rem;
      font-size: 0.9em;
      color: #666;
      font-family: 'Roboto Mono', monospace;
    }

    .foreign-keys {
      margin-top: 1rem;
    }

    .fk-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: #e8f5e8;
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .relationships-details h3 {
      margin-bottom: 1rem;
      color: #1976d2;
    }

    .no-relationships {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      color: #666;
    }

    .relationships-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .relationship-card {
      margin-bottom: 1rem;
    }

    .relationship-details p {
      margin: 0.5rem 0;
    }

    mat-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    mat-dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }
  `]
})
export class DatabaseVisualizationDialogComponent implements OnInit, OnDestroy {
  @ViewChild('mermaidContainer', { static: false }) mermaidContainer!: ElementRef;

  isLoading = true;
  error: string | null = null;
  databaseStructure: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<DatabaseVisualizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatabaseVisualizationData,
    private sqlImportService: SqlImportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDatabaseStructure();
    this.initializeMermaid();
    this.testMermaidAvailability();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeMermaid(): void {
    try {
      console.log('Initializing Mermaid...');
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        flowchart: {
          useMaxWidth: true,
          curve: 'basis'
        },
        er: {
          useMaxWidth: true
        },
        securityLevel: 'loose' // Allow more flexibility
      });
      console.log('Mermaid initialized successfully');
    } catch (error) {
      console.error('Error initializing Mermaid:', error);
    }
  }

  private loadDatabaseStructure(): void {
    this.isLoading = true;
    this.error = null;

    this.sqlImportService.getDatabaseStructure(this.data.databaseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (structure) => {
          this.databaseStructure = structure;
          this.isLoading = false;
          this.cdr.detectChanges();
          
          // Render the diagram after the view is updated
          setTimeout(() => {
            this.renderDiagram();
          }, 100);
        },
        error: (error) => {
          this.error = 'Fehler beim Laden der Datenbankstruktur: ' + (error.error?.message || error.message);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private renderDiagram(): void {
    if (!this.mermaidContainer || !this.databaseStructure) {
      console.log('Cannot render diagram: container or structure not available');
      return;
    }

    try {
      const mermaidCode = this.generateMermaidCode();
      console.log('Attempting to render diagram with code:', mermaidCode);
      
      this.mermaidContainer.nativeElement.innerHTML = '<p>Rendering diagram...</p>';
      
      mermaid.render('database-diagram', mermaidCode).then((result: any) => {
        console.log('Mermaid render result:', result);
        this.mermaidContainer.nativeElement.innerHTML = result.svg;
      }).catch((error: any) => {
        console.error('Error rendering mermaid diagram:', error);
        
        // Try fallback flowchart if ER diagram fails
        if (mermaidCode.startsWith('erDiagram')) {
          console.log('ER diagram failed, trying fallback flowchart...');
          const fallbackCode = this.generateFallbackFlowchart();
          
          mermaid.render('database-diagram-fallback', fallbackCode).then((fallbackResult: any) => {
            console.log('Fallback flowchart rendered successfully');
            this.mermaidContainer.nativeElement.innerHTML = `
              <div style="margin-bottom: 1rem; padding: 0.5rem; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                <p><strong>Hinweis:</strong> ER-Diagramm konnte nicht gerendert werden. Zeige vereinfachte Darstellung.</p>
              </div>
              ${fallbackResult.svg}
            `;
          }).catch((fallbackError: any) => {
            console.error('Fallback flowchart also failed:', fallbackError);
            this.showErrorWithCode(mermaidCode, error);
          });
        } else {
          this.showErrorWithCode(mermaidCode, error);
        }
      });
    } catch (error) {
      console.error('Error generating mermaid code:', error);
      this.mermaidContainer.nativeElement.innerHTML = `
        <div style="color: red; padding: 1rem;">
          <p><strong>Fehler beim Generieren des Diagramms:</strong></p>
          <p>${error instanceof Error ? error.message : String(error)}</p>
        </div>
      `;
    }
  }

  private showErrorWithCode(mermaidCode: string, error: any): void {
    this.mermaidContainer.nativeElement.innerHTML = `
      <div style="color: red; padding: 1rem;">
        <p><strong>Fehler beim Rendern des Diagramms:</strong></p>
        <p>${error.message || error}</p>
        <p><strong>Generated Mermaid Code:</strong></p>
        <pre style="background: #f5f5f5; padding: 0.5rem; border-radius: 4px; font-size: 0.8em; overflow-x: auto;">${mermaidCode}</pre>
      </div>
    `;
  }

  private testMermaidAvailability(): void {
    try {
      if (typeof mermaid !== 'undefined') {
        console.log('Mermaid library is available');
      } else {
        console.error('Mermaid library is not properly loaded');
      }
    } catch (error) {
      console.error('Error testing Mermaid availability:', error);
    }
  }

  private generateMermaidCode(): string {
    if (!this.databaseStructure?.structure?.tables) {
      return 'graph TD\n    A[Keine Tabellen gefunden]';
    }

    // Try ER diagram first, fallback to flowchart if it fails
    try {
      let mermaidCode = 'erDiagram\n';
      
      // Add tables first
      this.databaseStructure.structure.tables.forEach((table: any) => {
        // Sanitize table name for Mermaid
        const safeTableName = this.sanitizeName(table.name);
        mermaidCode += `    ${safeTableName} {\n`;
        
        table.columns.forEach((column: any) => {
          // Debug: Log the original column data
          console.log('Processing column:', column);
          
          // Sanitize column name and type
          const safeColumnName = this.sanitizeName(column.name);
          const safeColumnType = this.sanitizeType(column.type);

          // Merge constraints into a single string
          let constraints = [];
          if (column.isPrimary) constraints.push('PK');
          if (!column.isNullable) constraints.push('NOT NULL');
          let constraintStr = constraints.length ? ` "${constraints.join(', ')}"` : '';

          // Format: DataType ColumnName "Constraints"
          let columnDef = `        ${safeColumnType} ${safeColumnName}${constraintStr}`;
          mermaidCode += columnDef + '\n';
        });
        mermaidCode += '    }\n';
      });

      // Add relationships after all tables
      if (this.databaseStructure.structure.relationships) {
        this.databaseStructure.structure.relationships.forEach((rel: any) => {
          // Skip malformed relationships
          if (!rel.from || !rel.to || !rel.fromColumn || !rel.toColumn) {
            return;
          }
          
          // Sanitize relationship names
          const safeFrom = this.sanitizeName(rel.from);
          const safeTo = this.sanitizeName(rel.to);
          const safeFromColumn = this.sanitizeName(rel.fromColumn);
          const safeToColumn = this.sanitizeName(rel.toColumn);
          
          mermaidCode += `    ${safeFrom} ||--o{ ${safeTo} : "${safeFromColumn} -> ${safeToColumn}"\n`;
        });
      }

      console.log('Generated ER diagram code:', mermaidCode);
      return mermaidCode;
    } catch (error) {
      console.warn('Failed to generate ER diagram, falling back to flowchart:', error);
      return this.generateFallbackFlowchart();
    }
  }

  private generateFallbackFlowchart(): string {
    let mermaidCode = 'graph TD\n';
    
    // Add tables as nodes
    this.databaseStructure.structure.tables.forEach((table: any, index: number) => {
      const safeTableName = this.sanitizeName(table.name);
      const columns = table.columns.map((col: any) => 
        `${this.sanitizeName(col.name)}: ${this.sanitizeType(col.type)}${col.isPrimary ? ' (PK)' : ''}`
      ).join('<br/>');
      
      mermaidCode += `    ${safeTableName}[${table.name}<br/>${columns}]\n`;
    });

    // Add relationships as edges
    if (this.databaseStructure.structure.relationships) {
      this.databaseStructure.structure.relationships.forEach((rel: any) => {
        if (!rel.from || !rel.to || !rel.fromColumn || !rel.toColumn) {
          return;
        }
        
        const safeFrom = this.sanitizeName(rel.from);
        const safeTo = this.sanitizeName(rel.to);
        mermaidCode += `    ${safeFrom} -->|${rel.fromColumn} → ${rel.toColumn}| ${safeTo}\n`;
      });
    }

    console.log('Generated fallback flowchart code:', mermaidCode);
    return mermaidCode;
  }

  private sanitizeName(name: string): string {
    if (!name) return 'unknown';
    
    // Remove or replace problematic characters
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace non-alphanumeric chars with underscore
      .replace(/^[0-9]/, '_$&') // Prefix with underscore if starts with number
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  private sanitizeType(type: string): string {
    if (!type) return 'VARCHAR';
    
    // Map common SQL types to Mermaid-compatible types
    const typeMap: { [key: string]: string } = {
      'int': 'INT',
      'integer': 'INT',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'tinyint': 'TINYINT',
      'varchar': 'VARCHAR',
      'char': 'CHAR',
      'text': 'TEXT',
      'longtext': 'LONGTEXT',
      'mediumtext': 'MEDIUMTEXT',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'date': 'DATE',
      'time': 'TIME',
      'year': 'YEAR',
      'decimal': 'DECIMAL',
      'numeric': 'NUMERIC',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'boolean': 'BOOLEAN',
      'bool': 'BOOLEAN',
      'bit': 'BIT',
      'blob': 'BLOB',
      'longblob': 'LONGBLOB',
      'json': 'JSON',
      'enum': 'ENUM',
      'set': 'SET'
    };
    
    // Extract base type (remove length specifications)
    const baseType = type.toLowerCase().split('(')[0].trim();
    return typeMap[baseType] || 'VARCHAR';
  }

  refreshDiagram(): void {
    this.renderDiagram();
  }

  downloadDiagram(): void {
    if (!this.mermaidContainer) {
      return;
    }

    const svg = this.mermaidContainer.nativeElement.querySelector('svg');
    if (!svg) {
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${this.data.databaseName}_diagram.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  }

  onClose(): void {
    this.dialogRef.close();
  }
} 