import { cookies } from 'next/headers';
import { forbidden } from 'next/navigation';
import { verifySession } from 'src/modules/auth/authService';
import styles from './page.module.css';

export default async function Home(): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  const userName = verifySession(session?.value);

  if (!userName) forbidden();

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Welcome back, {userName}!</h1>
      </main>
    </div>
  );
}
