import { render } from 'preact';
import { LocationProvider, Router, Route } from 'preact-iso';
import { Home } from './pages/Home.jsx';
import { NotFound } from './pages/_404.jsx';
import './style.css';

export function App() {
	return (
		<LocationProvider>
			<Router>
				{/**@ts-expect-error*/}
				<Route path="/ui" component={Home} />
				<Route default component={NotFound} />
			</Router>
		</LocationProvider>
	);
}

render(<App />, document.getElementById('app'));
