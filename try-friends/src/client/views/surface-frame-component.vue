<template>
  <div>
    <nav>
      <ul>
        <li>
          <router-link
            to="/"
          >Ok
          </router-link>
        </li>
        <li>
          <router-link
            to="/about/"
          >About
          </router-link>
        </li>
      </ul>
    </nav>

    <main id="vue-router">
      <router-view/>
    </main>
  </div>
</template>

<style lang="scss">

</style>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class SurfaceFrameComponent extends Vue {
}
</script>
