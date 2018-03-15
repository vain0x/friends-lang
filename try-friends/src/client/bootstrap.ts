import Vue from 'vue';
import VueRouter from 'vue-router';
import { message } from '../core/awesome';
import { Assertion, unitTests } from '../core/testing';
import FrontPageComponent from './views/front-page-component.vue';
import { registerComponents, routes, vueRouter } from './views/routing';

const setUpVue = () => {
  (window as any).Vue = Vue;
};

const setUpVueRouter = () => {
  Vue.use(VueRouter);
  registerComponents();
};

const startApp = () => {
  return new Vue({
    router: vueRouter,
    template: '<surface-frame-component/>',
  }).$mount('#app');
};

export const main = () => {
  setUpVue();
  setUpVueRouter();
  startApp();
};

/// #if TESTING
unitTests((assert: Assertion) => {
  describe('index', () => {
    it('add', () => {
      assert.strictEqual(1 + 2, 3);
    });
  });
});
/// #endif
