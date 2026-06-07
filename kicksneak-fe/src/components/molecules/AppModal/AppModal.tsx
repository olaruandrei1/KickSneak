import { Dialog, DialogTitle, DialogContent, IconButton, Slide } from '@mui/material';
import { Close } from '@mui/icons-material';
import { forwardRef, type ReactNode } from 'react';
import type { TransitionProps } from '@mui/material/transitions';
import styles from './AppModal.module.css';

const SlideUp = forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface AppModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
    fullHeight?: boolean;
}

export const AppModal = ({
    open,
    onClose,
    title,
    children,
    maxWidth = 'sm',
    fullHeight = false,
}: AppModalProps) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth
            slots={{ transition: SlideUp }}
            slotProps={{
                paper: {
                    className: `${styles.paper} ${fullHeight ? styles.fullHeight : ''}`,
                },
            }}
        >
            {title && (
                <DialogTitle className={styles.title}>
                    {title}
                    <IconButton
                        onClick={onClose}
                        size="small"
                        className={styles.closeBtn}
                        aria-label="Close"
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>
            )}
            <DialogContent className={styles.content}>
                {children}
            </DialogContent>
        </Dialog>
    );
};