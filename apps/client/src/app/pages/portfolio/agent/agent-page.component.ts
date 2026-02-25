import { AgentResponse, AgentSource, User } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { TextFieldModule } from '@angular/cdk/text-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface ChatMessage {
  createdAt: Date;
  flags: string[];
  role: 'user' | 'assistant';
  sources: AgentSource[];
  text: string;
  toolsCalled: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    TextFieldModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  selector: 'gf-agent-page',
  styleUrls: ['./agent-page.scss'],
  templateUrl: './agent-page.html'
})
export class GfAgentPageComponent
  implements AfterViewChecked, OnDestroy, OnInit
{
  @ViewChild('messageList') private messageListRef!: ElementRef<HTMLElement>;

  public isLoading = false;
  public messages: ChatMessage[] = [];
  public queryInput = '';
  public user: User;

  private sessionId: string | undefined;
  private shouldScrollToBottom = false;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  public ngOnInit() {
    this.messages = [
      {
        createdAt: new Date(),
        flags: [],
        role: 'assistant',
        sources: [],
        text: $localize`Hello! I'm your portfolio AI assistant. Ask me anything about your holdings, performance, risk, or rebalancing strategies.`,
        toolsCalled: []
      }
    ];
  }

  public ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  public onSend() {
    const query = this.queryInput.trim();

    if (!query || this.isLoading) {
      return;
    }

    this.messages.push({
      createdAt: new Date(),
      flags: [],
      role: 'user',
      sources: [],
      text: query,
      toolsCalled: []
    });
    this.queryInput = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;
    this.changeDetectorRef.markForCheck();

    this.dataService
      .postAgentQuery({ query, sessionId: this.sessionId })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        error: () => {
          this.messages.push({
            createdAt: new Date(),
            flags: ['error'],
            role: 'assistant',
            sources: [],
            text: $localize`Something went wrong while generating your analysis. Please try again.`,
            toolsCalled: []
          });
          this.isLoading = false;
          this.shouldScrollToBottom = true;
          this.changeDetectorRef.markForCheck();
        },
        next: (agentResponse: AgentResponse) => {
          this.sessionId = agentResponse.sessionId;
          this.messages.push({
            createdAt: new Date(),
            flags: agentResponse.flags,
            role: 'assistant',
            sources: agentResponse.sources,
            text: agentResponse.response,
            toolsCalled: agentResponse.toolsCalled ?? []
          });
          this.isLoading = false;
          this.shouldScrollToBottom = true;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  public onReset() {
    this.sessionId = undefined;
    this.messages = [
      {
        createdAt: new Date(),
        flags: [],
        role: 'assistant',
        sources: [],
        text: $localize`Conversation reset. How can I help you?`,
        toolsCalled: []
      }
    ];
    this.changeDetectorRef.markForCheck();
  }

  public getDisplaySources(message: ChatMessage): AgentSource[] {
    const unique = new Map<string, AgentSource>();

    for (const source of message.sources ?? []) {
      const key = `${source.tool}:${source.field}`;

      if (!unique.has(key)) {
        unique.set(key, source);
      }
    }

    return [...unique.values()];
  }

  public getToolTags(message: ChatMessage): string[] {
    const tools = new Set<string>();

    for (const toolName of message.toolsCalled ?? []) {
      if (toolName) {
        tools.add(toolName);
      }
    }

    for (const source of message.sources ?? []) {
      if (source.tool) {
        tools.add(source.tool);
      }
    }

    return [...tools.values()];
  }

  public isErrorMessage(message: ChatMessage): boolean {
    return (
      message.flags?.includes('error') ||
      message.flags?.includes('verification_failed')
    );
  }

  public formatTimestamp(timestamp: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(timestamp);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private scrollToBottom() {
    const el = this.messageListRef?.nativeElement;

    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
