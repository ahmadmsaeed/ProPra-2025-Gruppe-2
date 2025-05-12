import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

// ➡️ Importiere das Tabs-Modul von Angular Material
import { MatTabsModule } from '@angular/material/tabs';

import { AppComponent } from './app.component';
import { FilterByStatusPipe } from './filter-by-status.pipe';

@NgModule({
  declarations: [
    AppComponent,
    FilterByStatusPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    // ➡️ hier hinzufügen:
    MatTabsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
