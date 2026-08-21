import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import CadastroImovel from '../views/CadastroImovel.vue';
import CadastroCliente from '../views/CadastroCliente.vue';
import Listagem from '../views/Listagem.vue';

const routes = [
  { path: '/',         name: 'Home',            component: Home },
  { path: '/imovel',  name: 'CadastroImovel',  component: CadastroImovel },
  { path: '/cliente', name: 'CadastroCliente', component: CadastroCliente },
  { path: '/listagem', name: 'Listagem',        component: Listagem },
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
