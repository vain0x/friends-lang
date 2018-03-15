import Vue from 'vue';
import VueRouter from 'vue-router';
import FrontPageComponent from './front-page-component.vue';
import SurfaceFrameComponent from './surface-frame-component.vue';

export const routes = [
  {
    path: '/',
    component: FrontPageComponent,
  },
  {
    path: '/about/',
    component: Vue.extend({
      template: `
        <article>
          <h2>About.</h2>
          <p>
            <strong>Friends-lang</strong> is a programming language.
          </p>
        </article>
      `,
    }),
  },
];

export const vueRouter = new VueRouter({
  mode: 'history',
  routes,
});

export const registerComponents = () => {
  Vue.component('surface-frame-component', SurfaceFrameComponent);
  Vue.component('front-page-component', FrontPageComponent);
};
