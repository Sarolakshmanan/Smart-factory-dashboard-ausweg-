import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WhiteComponent } from './white/white.component';


const routes: Routes = [
  // {path:"white-space", component:WhiteThemeComponent}
  {path:"white-theme",component:WhiteComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  
}
