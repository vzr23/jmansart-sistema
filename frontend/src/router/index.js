import { createRouter, createWebHistory } from 'vue-router';
import Home            from '../views/Home.vue';
import CadastroImovel  from '../views/CadastroImovel.vue';
import CadastroCliente from '../views/CadastroCliente.vue';
import Listagem        from '../views/Listagem.vue';
import Login           from '../views/Login.vue';

const routes = [
  { path: '/login',    name: 'Login',          component: Login,           meta: { public: true } },
  { path: '/',         name: 'Home',            component: Home },
  { path: '/imovel',   name: 'CadastroImovel',  component: CadastroImovel },
  { path: '/cliente',  name: 'CadastroCliente', component: CadastroCliente },
  { path: '/listagem', name: 'Listagem',        component: Listagem },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to, _from, next) => {
  const authenticated = sessionStorage.getItem('authenticated') === 'true';

  if (to.meta.public) {
    // Já autenticado: vai direto para Home em vez de mostrar login
    authenticated ? next({ name: 'Home' }) : next();
  } else {
    // Rota protegida: exige autenticação
    authenticated ? next() : next({ name: 'Login' });
  }
});

export default router;
