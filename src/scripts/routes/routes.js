import HomePage from '../pages/home/home-page';
import LoginPage from '../pages/auth/login-page';
import RegisterPage from '../pages/auth/register-page';
import StoryDetailPage from '../pages/story/story-detail-page';
import AddStoryPage from '../pages/story/add-story-page';

const routes = {
    '/': new HomePage(),
    '/login': new LoginPage(),
    '/register': new RegisterPage(),
    '/story/:id': new StoryDetailPage(),
    '/add-story': new AddStoryPage(),
};

export default routes;
