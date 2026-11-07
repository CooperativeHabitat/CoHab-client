import {getLoginState} from "@/services/loginStateResolver.ts";
import { HomeIcon } from 'lucide-vue-next'
import NotificationDropdown from './NotificationDropdown.vue'
import ProfileDropdown from './ProfileDropdown.vue'

export default {
    name: 'Header',
    components: {
        HomeIcon,
        NotificationDropdown,
        ProfileDropdown
    },

    setup() {
        const {loginState} = getLoginState();

        return{
            state: loginState,
        }
    }
}
