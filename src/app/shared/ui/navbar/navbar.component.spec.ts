import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { NavbarComponent, type NavbarUser } from './navbar.component';

/**
 * Unit tests for NavbarComponent using Angular Testing Library.
 *
 * Scenarios from user-auth spec (auth-state-listener):
 *  - When a user is signed in, the navbar greets them by name.
 *  - When no user is signed in, the greeting is hidden.
 */
describe('NavbarComponent', () => {
  it('renders the user name in the greeting when a user is provided', async () => {
    const user: NavbarUser = { nombre: 'Ada Lovelace' };

    await render(NavbarComponent, {
      inputs: { navbarUser: user },
    });

    const greeting = screen.getByTestId('navbar-user');
    expect(greeting).toBeInTheDocument();
    expect(greeting).toHaveTextContent('Ada Lovelace');
  });

  it('hides the greeting when no user is signed in', async () => {
    await render(NavbarComponent, {
      inputs: { navbarUser: null },
    });

    expect(screen.queryByTestId('navbar-user')).not.toBeInTheDocument();
  });
});
