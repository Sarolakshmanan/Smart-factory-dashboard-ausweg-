import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WhiteThemeComponent } from './white-theme/white-theme.component';

const routes: Routes = [
  {path:"white-space", component:WhiteThemeComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  
}
