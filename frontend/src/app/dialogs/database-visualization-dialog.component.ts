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
  templateUrl: './database-visualization-dialog.component.html',
  styleUrls: ['./database-visualization-dialog.component.scss']
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
    const isDark = document.body.classList.contains('dark-theme');
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      themeVariables: {
        // Optional: eigene Farben für Boxen, Text, Linien
        erTableBackground: isDark ? '#23262f' : '#fff',
        erTableBorderColor: isDark ? '#7986cb' : '#3f51b5',
        erTableTextColor: isDark ? '#f4f4f4' : '#333',
        erRelationshipLineColor: isDark ? '#90caf9' : '#333',
        erRelationshipLabelColor: isDark ? '#b0b3c0' : '#666',
      },
      flowchart: {
        useMaxWidth: true,
        curve: 'basis'
      },
      er: {
        useMaxWidth: true
      },
      securityLevel: 'loose'
    });
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

    try {
      let mermaidCode = 'erDiagram\n';

      this.databaseStructure.structure.tables.forEach((table: any) => {
        const safeTableName = this.sanitizeName(table.name);
        mermaidCode += `    ${safeTableName} {\n`;

        table.columns.forEach((column: any) => {
          console.log('Processing column:', column);

          const safeColumnName = this.sanitizeName(column.name);
          const safeColumnType = this.sanitizeType(column.type);

          let constraints = [];
          if (column.isPrimary) constraints.push('PK');
          if (!column.isNullable) constraints.push('NOT NULL');
          let constraintStr = constraints.length ? ` "${constraints.join(', ')}"` : '';

          let columnDef = `        ${safeColumnType} ${safeColumnName}${constraintStr}`;
          mermaidCode += columnDef + '\n';
        });
        mermaidCode += '    }\n';
      });

      if (this.databaseStructure.structure.relationships) {
        this.databaseStructure.structure.relationships.forEach((rel: any) => {
          if (!rel.from || !rel.to || !rel.fromColumn || !rel.toColumn) {
            return;
          }

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

    this.databaseStructure.structure.tables.forEach((table: any, index: number) => {
      const safeTableName = this.sanitizeName(table.name);
      const columns = table.columns.map((col: any) =>
        `${this.sanitizeName(col.name)}: ${this.sanitizeType(col.type)}${col.isPrimary ? ' (PK)' : ''}`
      ).join('<br/>');

      mermaidCode += `    ${safeTableName}[${table.name}<br/>${columns}]\n`;
    });

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

    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private sanitizeType(type: string): string {
    if (!type) return 'VARCHAR';

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