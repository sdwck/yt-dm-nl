import { User } from '../../types/user';
import { createSettingsIcon } from '../../shared/components/icons';
import { formatTime } from '../../shared/utils/time';
import { clearElement } from '../../shared/dom';
import { Chat } from '../../types/chat';
import { ChatType } from '../../types/chat';
import { createNewGroupIcon } from '../../shared/components/icons';
import { generateAvatarPlaceholder } from '../../shared/utils/avatar';
import { createSkeletonList, createDialogItemSkeleton } from '../../shared/components/skeletonComponent';

export interface DialogItem {
    chat: Chat;
    partner?: User;
    isUnread: boolean;
}

export interface DialogsViewProps {
    isSharing: boolean;
    selectDialog: (chat: Chat) => void;
    openSettings: () => void;
    openCreateGroup: () => void;
    copyMyLink: () => string | null;
}

export class DialogsView {
    private header: HTMLElement;
    private body: HTMLElement;
    private listContainer: HTMLElement;

    constructor(private container: HTMLElement, private props: DialogsViewProps) {
        this.header = document.createElement('div');
        this.header.className = 'yt-dm-chat-header';

        this.body = document.createElement('div');
        this.body.className = 'yt-dm-dialogs-body';

        this.container.append(this.header, this.body);

        this.renderHeader();

        if (props.isSharing) {
            const shareHeader = document.createElement('div');
            shareHeader.textContent = 'Select a conversation to share with';
            shareHeader.className = 'yt-dm-share-header';
            this.body.appendChild(shareHeader);
        } else {
            this.body.appendChild(this.createCopyLinkSection());
            this.body.appendChild(this.createNewGroupButton());
        }

        this.listContainer = document.createElement('div');
        this.listContainer.className = 'yt-dm-dialogs-list';
        this.body.appendChild(this.listContainer);
    }

    private createNewGroupButton(): HTMLElement {
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'yt-dm-action-button-wrapper';

        const button = document.createElement('button');
        button.className = 'yt-dm-new-group-button';
        button.onclick = (e) => { e.stopPropagation(); this.props.openCreateGroup(); };
        button.appendChild(createNewGroupIcon());
        buttonWrapper.append(button);
        return buttonWrapper;
    }

    private renderHeader(): void {
        const title = document.createElement('span');
        title.className = 'yt-dm-username';
        title.textContent = this.props.isSharing ? 'Share to...' : 'Messages';

        const settingsButton = document.createElement('button');
        settingsButton.className = 'yt-dm-icon-button';
        settingsButton.title = 'Settings';
        settingsButton.appendChild(createSettingsIcon());
        settingsButton.onclick = (e) => { e.stopPropagation(); this.props.openSettings(); };

        const headerControls = document.createElement('div');
        headerControls.className = 'yt-dm-header-controls';
        headerControls.appendChild(settingsButton);

        this.header.append(title, headerControls);
    }

    private createCopyLinkSection(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'yt-dm-copy-link-container';

        const button = document.createElement('button');
        button.className = 'yt-dm-copy-link-button';

        const svgNS = 'http://www.w3.org/2000/svg';
        const icon = document.createElementNS(svgNS, 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('height', '18');
        icon.setAttribute('width', '18');
        icon.style.marginLeft = '8px';

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('d', 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z');
        icon.appendChild(path);

        const span = document.createElement('span');
        span.textContent = 'Copy My Link';
        span.append(icon);
        span.className = 'yt-dm-copy-link-text';

        button.append(span);
        button.onclick = () => {
            const link = this.props.copyMyLink();
            if (link) {
                navigator.clipboard.writeText(link).then(() => {
                    span.textContent = 'Copied!';
                    button.classList.add('copied');
                    setTimeout(() => {
                        span.textContent = 'Copy My Link';
                        span.append(icon);
                        button.classList.remove('copied');
                    }, 2000);
                });
            }
        };

        container.appendChild(button);
        return container;
    }

    public renderDialogs(items: DialogItem[]): void {
        clearElement(this.listContainer);
        items.forEach((item, index) => {
            const unreadCount = items.filter(i => i.isUnread).length;
            const dialogItem = this.createDialogItemElement(item, index === 0, index === unreadCount - 1);
            this.listContainer.appendChild(dialogItem);
        });
    }

    private createDialogItemElement(item: DialogItem, isFirst: boolean, isLast: boolean): HTMLElement {
        const el = document.createElement('div');
        el.className = 'yt-dm-dialog-item';
        el.classList.toggle('unread', item.isUnread);
        el.classList.toggle('first', isFirst);
        el.classList.toggle('last', isLast);
        el.onclick = (e) => { e.stopPropagation(); this.props.selectDialog(item.chat); };

        const avatar = document.createElement('img');
        avatar.className = 'yt-dm-avatar';

        const textContainer = document.createElement('div');
        textContainer.className = 'yt-dm-dialog-text-container';

        const topRow = document.createElement('div');
        topRow.className = 'yt-dm-dialog-top-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';

        if (item.chat.type === ChatType.GROUP) {
            nameSpan.textContent = item.chat.name || 'Group Chat';
            avatar.src = item.chat.photoURL || generateAvatarPlaceholder(item.chat.name, 40);
        } else {
            if (item.partner) {
                nameSpan.textContent = item.partner.displayName || `User...${item.partner.uid.slice(-4)}`;
                avatar.src = item.partner.photoURL || 'https://placehold.co/40';
            } else {
                nameSpan.textContent = 'User';
                avatar.src = 'https://placehold.co/40';
            }
        }

        const timeSpan = document.createElement('span');
        timeSpan.className = 'yt-dm-chat-timestamp';
        timeSpan.textContent = formatTime(item.chat.updatedAt);

        topRow.append(nameSpan, timeSpan);

        const lastMessageSpan = document.createElement('span');
        lastMessageSpan.className = 'yt-dm-last-message';

        if (item.chat.lastMessage) {
            lastMessageSpan.textContent = item.chat.lastMessage.text || item.chat.lastMessage.video?.title || '...'
        } else {
            lastMessageSpan.textContent = 'No messages yet';
            lastMessageSpan.style.fontStyle = 'italic';
        }

        textContainer.append(topRow, lastMessageSpan);
        el.append(avatar, textContainer);

        return el;
    }

    public renderLoading(): void {
        clearElement(this.listContainer);
        const skeletonItems = createSkeletonList(7, createDialogItemSkeleton);
        this.listContainer.append(...skeletonItems);
    }

    public renderEmpty(): void { this.renderStateMessage('No conversations yet. Click "Copy My Link" to invite someone.'); }

    private renderStateMessage(text: string): void {
        clearElement(this.listContainer);
        const div = document.createElement('div');
        div.className = 'yt-dm-state-message';
        div.textContent = text;
        this.listContainer.appendChild(div);
    }

    public destroy(): void {
        clearElement(this.container);
    }
}