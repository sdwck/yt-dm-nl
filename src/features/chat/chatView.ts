import { User } from '../../types/user';
import { Message } from '../../types/message';
import { createMessageElement } from '../../shared/components/messageComponent';
import { createShareIcon, createBackArrowIcon, createMoreVertIcon } from '../../shared/components/icons';
import { formatDateSeparator } from '../../shared/utils/time';
import { clearElement } from '../../shared/dom';
import { Chat, ChatType } from '../../types/chat';
import { authService } from '../../services/authService';
import { generateAvatarPlaceholder } from '../../shared/utils/avatar';
import { createMessageListSkeleton } from '../../shared/components/skeletonComponent';

export interface ChatViewProps {
    chat: Chat;
    partner: User | null;
    back: () => void;
    sendMessage: (text: string) => void;
    shareVideo: (includeTimestamp: boolean) => void;
    loadOlderMessages: () => void;
    ignoreUser?: (uid: string) => void;
    getVideoId: () => string | null;
    leaveGroup?: () => void;
    addMember?: () => void;
    groupInfo?: () => void;
    deleteGroup?: () => void;
}

export class ChatView {
    private header: HTMLElement;
    private messageList: HTMLElement;
    private footer: HTMLElement;
    private shareButton: HTMLButtonElement | null = null;
    private props: ChatViewProps;
    private handleScroll: () => void;
    private isGroupChat: boolean;

    constructor(private container: HTMLElement, props: ChatViewProps) {
        this.props = props;
        this.isGroupChat = props.chat.type === ChatType.GROUP;

        this.header = document.createElement('div');
        this.header.className = 'yt-dm-chat-header';

        this.messageList = document.createElement('div');
        this.messageList.className = 'yt-dm-message-list';

        this.footer = document.createElement('div');
        this.footer.className = 'yt-dm-chat-footer';

        this.container.append(this.header, this.messageList, this.footer);

        this.renderHeader();
        this.renderFooter();

        this.handleScroll = () => {
            if (this.messageList.scrollTop < 50) {
                this.props.loadOlderMessages();
            }
        };
        this.messageList.addEventListener('scroll', this.handleScroll, { passive: true });
    }

    private renderHeader(): void {
        const backBtn = document.createElement('button');
        backBtn.className = 'yt-dm-icon-button';
        backBtn.appendChild(createBackArrowIcon());
        backBtn.onclick = (e) => { e.stopPropagation(); this.props.back(); };

        const chatHeaderContainer = document.createElement('div');
        chatHeaderContainer.className = 'yt-dm-chat-header-container';

        const avatar = document.createElement('img');
        avatar.className = 'yt-dm-avatar-medium';

        const title = document.createElement('span');
        title.className = 'yt-dm-username';

        const contextMenu = document.createElement('div');
        contextMenu.className = 'yt-dm-context-menu';

        if (this.isGroupChat) {
            avatar.src = this.props.chat.photoURL || generateAvatarPlaceholder(this.props.chat.name, 40);
            title.textContent = this.props.chat.name || 'Group Chat';
        } else if (this.props.partner) {
            avatar.src = this.props.partner.photoURL || generateAvatarPlaceholder(this.props.partner.displayName, 40);
            title.textContent = this.props.partner.displayName || 'Chat';
        }

        const leftHeader = document.createElement('div');
        leftHeader.className = 'yt-dm-chat-header-left';
        chatHeaderContainer.append(avatar, title);
        leftHeader.append(backBtn, chatHeaderContainer);

        this.header.append(leftHeader, this.createMoreMenu());
    }

    private createMoreMenu(): HTMLElement {
        const moreButton = document.createElement('button');
        moreButton.className = 'yt-dm-icon-button';
        moreButton.appendChild(createMoreVertIcon());

        const contextMenu = document.createElement('div');
        contextMenu.className = 'yt-dm-context-menu';

        if (this.isGroupChat) {
            const isAdmin = this.props.chat.admins?.includes(authService.currentUser!.uid);

            if (isAdmin) {
                const addMemberOption = document.createElement('div');
                addMemberOption.className = 'yt-dm-context-menu-item';
                addMemberOption.textContent = 'Add Member';
                addMemberOption.onclick = (e) => { e.stopPropagation(); this.props.addMember?.(); };

                contextMenu.append(addMemberOption);
            }

            const groupInfoOption = document.createElement('div');
            groupInfoOption.className = 'yt-dm-context-menu-item';
            groupInfoOption.textContent = 'Group Info';
            groupInfoOption.onclick = (e) => { e.stopPropagation(); this.props.groupInfo?.(); };

            const leaveOption = document.createElement('div');
            leaveOption.className = 'yt-dm-context-menu-item leave-group';
            if (this.props.chat.creator === authService.currentUser!.uid) {
                leaveOption.textContent = 'Delete Group';
                leaveOption.onclick = (e) => { e.stopPropagation(); this.props.deleteGroup?.(); }
            }
            else {
                leaveOption.textContent = 'Leave Group';
                leaveOption.onclick = (e) => { e.stopPropagation(); this.props.leaveGroup?.(); };
            }

            contextMenu.append(groupInfoOption, leaveOption);

        } else if (this.props.partner) {
            const ignoreOption = document.createElement('div');
            ignoreOption.className = 'yt-dm-context-menu-item';
            ignoreOption.textContent = 'Add to Ignore List';
            ignoreOption.onclick = (e) => {
                e.stopPropagation();
                this.props.ignoreUser?.(this.props.partner!.uid);
            };
            contextMenu.appendChild(ignoreOption);
        }

        moreButton.onclick = (e) => {
            e.stopPropagation();
            contextMenu.classList.toggle('visible');
            setTimeout(() => document.addEventListener('click', (ev) => {
                if (!contextMenu.contains(ev.target as Node)) {
                    contextMenu.classList.remove('visible');
                }
            }, { once: true }), 0);
        };

        const headerControls = document.createElement('div');
        headerControls.className = 'yt-dm-header-controls';
        headerControls.append(moreButton, contextMenu);
        return headerControls;
    }

    private renderFooter(): void {
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'yt-dm-input-wrapper';

        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'yt-dm-message-input';
        inputElement.placeholder = 'Say something...';
        inputElement.maxLength = 500;
        setTimeout(() => inputElement.select(), 0);

        const charCounter = document.createElement('div');
        charCounter.className = 'yt-dm-char-counter';

        const handleInput = () => {
            const len = inputElement.value.length;
            charCounter.textContent = `${len} / 500`;
            charCounter.classList.toggle('visible', len >= 400);
            charCounter.classList.toggle('limit-exceeded', len >= 500);
        };
        inputElement.addEventListener('input', handleInput);

        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = inputElement.value.trim();
                if (text) {
                    this.props.sendMessage(text);
                    inputElement.value = '';
                    handleInput();
                }
            }
        });

        inputWrapper.append(inputElement, charCounter);
        this.footer.appendChild(inputWrapper);

        if (this.props.getVideoId()) {
            this.shareButton = this.createShareButton();
            this.footer.appendChild(this.shareButton);
        }
    }

    private createShareButton(): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = 'yt-dm-icon-button share-video-button';
        button.title = 'Share current video';
        button.appendChild(createShareIcon());

        const menu = document.createElement('div');
        menu.className = 'yt-dm-context-menu';

        const createOption = (text: string, withTimestamp: boolean) => {
            const option = document.createElement('div');
            option.className = 'yt-dm-context-menu-item';
            option.textContent = text;
            option.onclick = (e) => {
                e.stopPropagation();
                menu.classList.remove('visible');
                this.props.shareVideo(withTimestamp);
            };
            return option;
        };

        menu.append(createOption('Share Video', false), createOption('Share with Timestamp', true));
        button.appendChild(menu);

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('visible');
            setTimeout(() => document.addEventListener('click', (ev) => {
                if (!menu.contains(ev.target as Node)) {
                    menu.classList.remove('visible');
                }
            }, { once: true }), 0);
        });

        return button;
    }

    public async renderMessages(msgs: Message[], chatType: ChatType, position: 'top' | 'bottom', shouldScroll?: boolean): Promise<void> {
        if (this.messageList.querySelector('.skeleton-item')) {
            clearElement(this.messageList);
        }

        const fragment = document.createDocumentFragment();
        const isAtBottom = this.messageList.scrollHeight - this.messageList.scrollTop - this.messageList.clientHeight < 50;
        const firstVisibleMessage = position === 'top' ? this.messageList.querySelector('.yt-dm-message-container') : null;

        for (const msg of msgs) {
            const dateSeparator = this.createDateSeparator(msg);
            fragment.appendChild(dateSeparator);
            const messageEl = await createMessageElement(msg, chatType);
            fragment.appendChild(messageEl);
        }

        if (position === 'top') {
            this.messageList.prepend(fragment);
            firstVisibleMessage?.scrollIntoView({ block: 'start' });
        } else {
            this.messageList.appendChild(fragment);
        }

        this.cleanupDateSeparators();
        if (shouldScroll && isAtBottom) this.scrollToBottom();
    }

    private createDateSeparator(msg: Message): HTMLElement {
        const separator = document.createElement('div');
        separator.className = 'yt-dm-date-separator';
        if (msg.timestamp) {
            separator.dataset.dateString = msg.timestamp.toDate().toDateString();
            separator.textContent = formatDateSeparator(msg.timestamp);
        }
        return separator;
    }

    private cleanupDateSeparators(): void {
        const separators = this.messageList.querySelectorAll<HTMLElement>('.yt-dm-date-separator');
        let lastDate: string | null = null;
        separators.forEach(sep => {
            const currentDate = sep.dataset.dateString;
            if (currentDate === lastDate) sep.remove();
            else lastDate = currentDate || null;
        });
    }

    public scrollToBottom(): void {
        setTimeout(() => this.messageList.scrollTop = this.messageList.scrollHeight, 0);
    }

    public setShareButtonState(enabled: boolean): void {
        if (this.shareButton) this.shareButton.disabled = !enabled;
    }

    public renderSkeleton(): void {
        clearElement(this.messageList);
        const skeletonMessages = createMessageListSkeleton();
        this.messageList.append(...skeletonMessages);
    }

    public destroy(): void {
        this.messageList.removeEventListener('scroll', this.handleScroll);
        clearElement(this.container);
    }
}