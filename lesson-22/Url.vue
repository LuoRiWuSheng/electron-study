<template>
  <div class="top-nav">
    <input type="text" v-model="url" />
  </div>
</template>

<script>
export default {
  data () {
    return {
      url: ""
    }
  },
  mounted () {
    this.url = location.href
  },
  watch: {
    $route (to, from) {
      if (to.fullPath.match(/\s+/g)) {
        return
      }
      this.url = this.url.split("#")[0] + "#" + to.fullPath
    },
    url (val, oldVal) {
      if (val.match(/\s+/g)) {
        this.url = val.trim()
        return
      }
      const v = val.split("#")[1]

      this.$router.push(v)
    }
  }
}
</script>

<style lang="scss" scoped>
.top-nav {
  position: fixed;
  left: 10px;
  top: 0rem;
  z-index: 10;
}
.top-nav input {
  width: 40rem;
  height: 3rem;
  font-size: 2rem;

  background: #fff;
  outline: none;
  border: 4px solid yellow;
  color: #000;
}
</style>