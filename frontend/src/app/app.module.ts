import { NgModule } from '@angular/core';
import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// Angular Material optimized imports
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_RIPPLE_GLOBAL_OPTIONS, RippleGlobalOptions } from '@angular/material/core';

import { AppComponent } from './app-component/app.component';
import { FilterByStatusPipe } from './filter-by-status.pipe';
import { jwtInterceptor } from './jwt.interceptor';

// Global ripple configuration
const globalRippleConfig: RippleGlobalOptions = {
  disabled: false,
  animation: {
    enterDuration: 300,
    exitDuration: 100
  }
};

@NgModule({
  declarations: [
    AppComponent,
    FilterByStatusPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule,
    HttpClientModule,
    HammerModule, // For better touch support
    
    // Material modules
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    
    FormsModule
  ],
  providers: [
    // Configure Material ripple effect
    { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
    
    // HTTP interceptors
    { 
      provide: HTTP_INTERCEPTORS, 
      useFactory: () => jwtInterceptor, 
      multi: true 
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
