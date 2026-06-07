import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Twitter, Facebook, Instagram, YouTube } from '@mui/icons-material';
import { cachedFetch } from '../../../services/cachedFetchService';
import { ApiRoutes } from '../../../services/apiRoutes';
import styles from './Footer.module.css';

interface FooterData {
    columns: { title: string; links: { label: string; href: string }[] }[];
    social: { platform: string; href: string }[];
    legal: { label: string; href: string }[];
    copyright: string;
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
    Twitter: <Twitter sx={{ fontSize: 20 }} />,
    Facebook: <Facebook sx={{ fontSize: 20 }} />,
    Instagram: <Instagram sx={{ fontSize: 20 }} />,
    YouTube: <YouTube sx={{ fontSize: 20 }} />,
};

export const Footer = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<FooterData | null>(null);

    useEffect(() => {
        cachedFetch<FooterData>({
            key: 'footer_data',
            url: ApiRoutes.footerData,
            onData: (d) => setData(d),
        });
    }, []);

    if (!data) return null;

    return (
        <footer className={styles.footer}>

            <div className={styles.main}>
                <div className={styles.inner}>
                    <div className={styles.brand}>
                        <span className={styles.logo}>KickSneak</span>
                    </div>
                    <div className={styles.grid}>
                        {data.columns.map((col) => (
                            <div key={col.title} className={styles.col}>
                                <span className={styles.colTitle}>{col.title}</span>
                                <ul className={styles.colList}>
                                    {col.links.map((link, i) => (
                                        <li key={`${link.href}-${i}`}>
                                            <button
                                                className={styles.link}
                                                onClick={() => navigate(link.href)}
                                            >
                                                {link.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.bottom}>
                <div className={styles.bottomInner}>
                    <span className={styles.logo2}>KickSneak.</span>

                    <div className={styles.social}>
                        {data.social.map((s) => (
                            <a
                                key={s.platform}
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label={s.platform}
                            >
                                {SOCIAL_ICONS[s.platform]}
                            </a>
                        ))}
                    </div>

                    <div className={styles.legal}>
                        {data.legal.map((l, i) => (
                            <span key={`${l.href}-${i}`} className={styles.legalItem}>
                                {i > 0 && <span className={styles.legalSep}>·</span>}
                                <button
                                    className={styles.legalLink}
                                    onClick={() => navigate(l.href)}
                                >
                                    {l.label}
                                </button>
                            </span>
                        ))}
                        <span className={styles.legalSep}>·</span>
                        <span className={styles.copyright}>{data.copyright}</span>
                    </div>
                </div>
            </div>

        </footer>
    );
};