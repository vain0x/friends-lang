<template>
  <article id="main-content">
    <header>
      <img
        id="header-logo"
        width="874px"
        height="350px"
        alt="logo"
        src="/assets/logo.png"
      >
    </header>

    <main id="vue-router">
      <router-view/>
    </main>

    <footer>
      Try Friends-lang powered by
        <a href="https://aratama.github.io/kemonogen/">Kemono Friends Logo Generator</a>
        and <a href="https://www.flickr.com/photos/5lab/4004317022/">Savanna</a>.
    </footer>
  </article>
</template>

<style lang="scss">
</style>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class SurfaceFrameComponent extends Vue {
}
</script>
