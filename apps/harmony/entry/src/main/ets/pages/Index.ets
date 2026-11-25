import { common } from '@kit.AbilityKit';
import { pasteboard, BusinessError } from '@kit.BasicServicesKit';
import { audio } from '@kit.AudioKit';
import { vibrator } from '@kit.SensorServiceKit';
import { media } from '@kit.MediaKit';
import { image } from '@kit.ImageKit';
import { fileIo, fileUri } from '@kit.CoreFileKit';
import { photoAccessHelper } from '@kit.MediaLibraryKit';
import { systemShare } from '@kit.ShareKit';

import { Metro, MetroSnapshot } from '../model/metro';
import { PandaEngine, drawPandaCanvas, getPandaCopy } from '../model/panda';
import { Store } from '../model/Store';
import { Plan, Session, ThemeSetting } from '../model/types';
import { formatClock, formatDuration, formatPlanDuration, pad2, todayKey, ymd } from '../model/time';
import { QUOTES } from '../model/quotes';

const DAYS: string[] = ['日', '一', '二', '三', '四', '五', '六'];
const TABS: string[] = ['今日', '训练', '记录', '设置'];
const ICONS: string[] = ['home', 'train', 'history', 'settings'];
const THEMES: ThemeSetting[] = ['light', 'dark', 'system'];
const THEME_NAMES: string[] = ['浅色', '深色', '跟随系统'];
const MILESTONES: number[] = [1, 7, 30, 100, 365];
const MILESTONE_LINES: string[] = ['开始了。', '第一周，兑现了。', '三十天，身体记得。', '一百天，已经是习惯了。', '一年，一格一格亮着。'];
const BADGES: string[] = ['第一天', '一周', '三十天', '一百天', '一年'];
const REVIEW_LINES: string[] = ['坚持的形状，是一格一格亮起来的', '日复一日，身体在悄悄记住', '看得见的，是你不声不响的坚持'];
const INDICES: number[] = [0, 1, 2, 3, 4, 5, 6];

@Entry
@Component
struct Index {
  @StorageProp('foreground') @Watch('foregroundChanged') foreground: boolean = true;
  @StorageProp('systemDark') systemDark: boolean = false;
  @State tab: number = 0;
  @State revision: number = 0;
  @State viewportWidth: number = 375;
  @State guide: boolean = false;
  @State month: number = new Date().getMonth();
  @State year: number = new Date().getFullYear();
  @State selected: string = todayKey();
  @State snapshot: MetroSnapshot | undefined = undefined;
  @State shareType: string = '';
  @State milestone: number = -1;
  @State saving: boolean = false;
  @State sharing: boolean = false;
  @State ready: boolean = false;
  private backupSharing: boolean = false;
  private canvas: CanvasRenderingContext2D = new CanvasRenderingContext2D(new RenderingContextSettings(true));
  private pandaCanvas: CanvasRenderingContext2D = new CanvasRenderingContext2D(new RenderingContextSettings(true));
  private pandaEngine: PandaEngine = new PandaEngine();
  private pandaLastTs: number = 0;
  private pandaReady: boolean = false;
  private persistedStore?: Store;

  currentStore(): Store | undefined {
    return this.revision > 0 ? this.persistedStore : undefined;
  }
  private animationTimer: number = -1;
  private metro?: Metro;
  private plan?: Plan;
  private lastPhase: string = '';
  private sound?: media.SoundPool;
  private high: number = -1;
  private low: number = -1;

  aboutToAppear(): void {
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    this.persistedStore = new Store(context);
    this.cleanBackupFiles();
    this.revision++;
    this.metro = new Metro({
      onRecord: (plan: Plan, reps: number, duration: number, finished: boolean): void => {
        const prev = this.currentStore()!.streak.current;
        this.currentStore()!.record(plan, reps, duration, finished);
        const next = this.currentStore()!.streak.current;
        if (finished && next > prev && MILESTONES.some((value: number) => prev < value && next >= value)) this.milestone = MILESTONES.filter((value: number) => value <= next).length - 1;
        this.revision++;
      }
    });
    this.metro.subscribe((state: MetroSnapshot): void => {
      this.snapshot = state;
      if (this.plan) {
        this.pandaEngine.sync(state, this.plan.contract, this.plan.relax);
      }
      if (state.state === 'running' && state.phase !== this.lastPhase) {
        this.lastPhase = state.phase;
        this.feedback(state.phase === 'contract');
      }
      if (state.state !== 'idle' && this.animationTimer < 0) {
        this.pandaLastTs = Date.now();
        this.animationTimer = setInterval(() => this.renderPandaFrame(), 32);
      } else if (state.state === 'idle') {
        this.stopBreathingAnimation();
        this.pandaReady = false;
      }
    });
    this.loadAudio(context);
  }

  async loadAudio(context: common.UIAbilityContext): Promise<void> {
    try {
      this.sound = await media.createSoundPool(2, {
        usage: audio.StreamUsage.STREAM_USAGE_MUSIC, rendererFlags: 0
      });
      const hi = context.resourceManager.getRawFdSync('audio/beep_high.wav');
      const lo = context.resourceManager.getRawFdSync('audio/beep_low.wav');
      try {
        this.high = await this.sound.load(hi.fd, hi.offset, hi.length);
        this.low = await this.sound.load(lo.fd, lo.offset, lo.length);
      } finally {
        context.resourceManager.closeRawFdSync('audio/beep_high.wav');
        context.resourceManager.closeRawFdSync('audio/beep_low.wav');
      }
    } catch {
      this.high = -1;
      this.low = -1;
    }
  }

  feedback(contract: boolean): void {
    if (this.currentStore()!.settings.sound && this.sound && this.high >= 0 && this.low >= 0) {
      this.sound.play(contract ? this.high : this.low).catch(() => {});
    }
    if (this.currentStore()!.settings.haptics) {
      try {
        vibrator.startVibration({ type: 'time', duration: contract ? 25 : 15 },
          { id: 0, usage: 'touch' }).catch(() => {});
      } catch {}
    }
  }

  foregroundChanged(): void {
    if (this.foreground) this.onPageShow();
    else this.onPageHide();
  }

  renderPandaFrame(): void {
    if (!this.pandaReady || !this.snapshot || this.snapshot.state === 'idle') return;
    const now = Date.now();
    const dt = this.pandaLastTs > 0 ? Math.min(0.05, Math.max(0.001, (now - this.pandaLastTs) / 1000)) : 0.032;
    this.pandaLastTs = now;
    const size = this.r(this.snapshot.stage === 'done' ? 380 : 480);
    const frame = this.pandaEngine.step(dt, this.dark());
    drawPandaCanvas(this.pandaCanvas, size, frame, this.dark());
  }

  stopBreathingAnimation(): void {
    if (this.animationTimer < 0) return;
    clearInterval(this.animationTimer);
    this.animationTimer = -1;
  }

  onPageHide(): void {
    this.metro?.pause();
    if (this.snapshot?.state === 'prep') this.metro?.endEarly();
  }

  onPageShow(): void {
    this.currentStore()?.refreshStreak();
    this.revision++;
  }

  aboutToDisappear(): void {
    this.stopBreathingAnimation();
    this.metro?.dispose();
    this.sound?.release().catch(() => {});
  }

  onBackPress(): boolean {
    if (this.shareType) {
      this.shareType = '';
      return true;
    }
    if (this.snapshot && this.snapshot.state !== 'idle') {
      this.finish(false);
      return true;
    }
    return false;
  }

  start(plan: Plan): void {
    this.plan = plan;
    this.lastPhase = '';
    this.milestone = -1;
    this.pandaEngine.reset();
    this.metro?.open(plan);
  }

  finish(share: boolean): void {
    if (this.snapshot?.stage === 'done') {
      this.metro?.close(true);
      if (share) this.openShare('daily');
      else if (this.milestone >= 0) this.openShare('milestone');
    } else {
      this.metro?.endEarly();
    }
  }

  dark(): boolean {
    const theme = this.currentStore()?.settings.theme;
    return theme === 'dark' || (theme === 'system' && this.systemDark);
  }

  color(light: string, dark: string): string { return this.dark() ? dark : light; }
  paper(): string { return this.color('#FAF3EC', '#1F1814'); }
  soft(): string { return this.color('#F3E8DC', '#2A201A'); }
  deep(): string { return this.color('#EBDDCB', '#352821'); }
  card(): string { return this.color('#FFFCF8', '#2A201A'); }
  ink(): string { return this.color('#2B2320', '#F2E8DC'); }
  secondary(): string { return this.color('#5C4F47', '#D0C2B4'); }
  muted(): string { return this.color('#6F5F50', '#B5A595'); }
  accent(): string { return this.color('#E85A4F', '#FF6B5E'); }
  buttonColor(): string { return this.color('#C8402E', '#FF6B5E'); }
  onButton(): string { return this.color('#FFFFFF', '#1F1814'); }
  rule(): string { return this.color('#1F2B2320', '#29F2E8DC'); }
  strong(): string { return this.color('#3D2B2320', '#52F2E8DC'); }
  relax(): string { return this.color('#6C8B6A', '#8FB08A'); }
  heat(level: number): string {
    return ['#00000000', this.color('#F0DCC9', '#3D2E24'), this.color('#E8B59A', '#6B4234'),
      this.buttonColor()][level];
  }

  r(rpx: number): number { return this.viewportWidth * rpx / 750; }
  done(): number { return this.currentStore()!.completed(todayKey()); }
  goal(): number { return this.currentStore()!.settings.dailyGoalGroups; }
  met(): boolean { return this.done() >= this.goal(); }
  dateAgo(days: number): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  }

  dateLabel(): string {
    const now = new Date();
    return (now.getMonth() + 1) + '.' + pad2(now.getDate()) + ' 周' + DAYS[now.getDay()];
  }

  dailyQuote(): string {
    const now = new Date();
    return this.met() ? '今日目标已达成，想加练随时再来一组。' : this.pickQuote(now.getDate() + now.getMonth() * 31);
  }

  saveSettings(): void {
    this.currentStore()!.saveSettings();
    this.revision++;
  }

  changeGoal(delta: number): void {
    this.currentStore()!.settings.dailyGoalGroups = Math.max(1, Math.min(8, this.goal() + delta));
    this.saveSettings();
  }

  moveMonth(delta: number): void {
    const month = new Date(this.year, this.month + delta, 1);
    this.year = month.getFullYear();
    this.month = month.getMonth();
    this.selected = '';
  }

  calendarDay(week: number, index: number): number {
    return week * 7 + index + 1 - new Date(this.year, this.month, 1).getDay();
  }

  calendarKey(day: number): string {
    return ymd(new Date(this.year, this.month, day));
  }

  weeks(): number[] {
    const count = new Date(this.year, this.month + 1, 0).getDate();
    return INDICES.slice(0, Math.ceil((count + new Date(this.year, this.month, 1).getDay()) / 7));
  }

  async copy(value: string, message: string): Promise<void> {
    try {
      await pasteboard.getSystemPasteboard().setData(pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, value));
      this.toast(message);
    } catch {
      this.toast('复制失败');
    }
  }

  toast(message: string): void {
    this.getUIContext().getPromptAction().showToast({ message: message });
  }

  confirmClear(): void {
    this.getUIContext().showAlertDialog({
      title: '清空记录与设置？',
      message: '训练记录、连续天数和偏好设置都会被删除，且无法恢复。建议先导出备份。',
      primaryButton: { value: '取消', action: () => {} },
      secondaryButton: { value: '清空', fontColor: '#C83328', action: () => {
        if (this.backupSharing) { this.toast('请先结束备份分享'); return; }
        try {
          this.cleanBackupFiles();
          this.currentStore()!.clear();
          this.revision++;
          this.toast('已清空');
        } catch {
          this.toast('未能清空全部数据，请重试');
        }
      } }
    });
  }

  @Builder home() {
    Row() {
      Text(this.dateLabel()).fontSize(this.r(28)).fontColor(this.secondary()).fontWeight(FontWeight.Medium)
      Blank()
      Image($rawfile(this.dark() ? 'icons/share-d.png' : 'icons/share.png'))
        .width(this.r(44)).height(this.r(44)).accessibilityText('分享')
        .onClick(() => { this.openShare('review'); })
    }.width('100%')
    Text(this.met() ? '今天，提了。' : '今天，提了么？')
      .fontSize(this.r(68)).fontWeight(FontWeight.Bold).fontColor(this.ink()).letterSpacing(this.r(2))
      .lineHeight(this.r(82))
    if (this.currentStore()!.settings.dailyQuote) {
      Text(this.dailyQuote()).fontColor(this.secondary()).fontSize(this.r(30)).lineHeight(this.r(46))
        .margin({ top: this.r(20) })
    }
    Row() {
      this.progressColumn(false)
      Text('/').fontSize(this.r(80)).fontWeight(FontWeight.Lighter).fontColor(this.muted())
        .padding({ left: this.r(24), right: this.r(24) }).lineHeight(this.r(128))
      this.progressColumn(true)
    }.width('100%').alignItems(VerticalAlign.Top).margin({ top: this.r(16) })
      .padding({ bottom: this.r(44) }).border({ width: { bottom: this.r(2) }, color: this.rule() })
    if (this.currentStore()!.streak.current > 0) {
      Row() {
        this.streakColumn(false)
        Divider().vertical(true).height(this.r(72)).color(this.rule()).margin({ left: this.r(32), right: this.r(32) })
        this.streakColumn(true)
      }.width('100%').padding({ left: this.r(40), right: this.r(40), top: this.r(32), bottom: this.r(32) })
        .backgroundColor(this.soft()).border({ width: this.r(2), color: this.rule(), radius: this.r(36) })
        .margin({ top: this.r(40) })
    }
    Row() {
      ForEach(INDICES, (index: number) => {
        Column({ space: this.r(10) }) {
          Row().width(this.r(56)).height(this.r(56))
            .backgroundColor(this.heat(this.currentStore()!.heat(ymd(this.dateAgo(6 - index)))))
            .border({ width: this.r(3), color: index === 6 ? this.accent() : this.strong(), radius: this.r(16) })
          Text(DAYS[this.dateAgo(6 - index).getDay()]).fontSize(this.r(24)).fontColor(index === 6 ? this.accent() : this.secondary()).fontWeight(index === 6 ? FontWeight.Bold : FontWeight.Medium)
        }.layoutWeight(1)
      })
    }.width('100%').margin({ top: this.r(52), bottom: this.r(52) })
    Text(this.met() ? '再练一组' : '开始训练').fontSize(this.r(32)).fontWeight(FontWeight.Bold).fontColor(this.met() ? this.ink() : this.onButton())
      .height(this.r(92)).width('100%').textAlign(TextAlign.Center)
      .backgroundColor(this.met() ? this.deep() : this.buttonColor()).borderRadius(this.r(46)).onClick(() => this.start(this.currentStore()!.activePlan()))
    Text() {
      Span(this.currentStore()!.activePlan().name + ' · ' + formatPlanDuration(this.currentStore()!.activePlan()) + ' · ')
      Span('切换 ›').fontColor(this.accent()).fontWeight(FontWeight.Medium)
    }.width('100%').textAlign(TextAlign.Center).fontSize(this.r(26)).fontColor(this.muted())
      .margin({ top: this.r(24) }).padding({ top: this.r(12), bottom: this.r(12) })
      .onClick(() => { this.tab = 1; })
  }

  @Builder progressColumn(isGoal: boolean) {
    Column({ space: this.r(8) }) {
      Text((isGoal ? this.goal() : this.done()).toString()).fontSize(this.r(144)).lineHeight(this.r(160))
        .fontWeight(FontWeight.Bold).fontColor(isGoal ? this.secondary() : this.met() ? this.relax() : this.accent())
      Text(isGoal ? '今日目标' : '已完成组').fontSize(this.r(28)).fontColor(this.muted())
    }.layoutWeight(1).alignItems(HorizontalAlign.Start)
  }

  @Builder streakColumn(longest: boolean) {
    Column({ space: this.r(8) }) {
      Text(longest ? '历史最长' : '当前连续').fontSize(this.r(24)).fontColor(this.muted())
      Text((longest ? this.currentStore()!.streak.longest : this.currentStore()!.streak.current) + ' 天')
        .fontSize(this.r(52)).fontColor(longest ? this.ink() : this.accent()).fontWeight(FontWeight.Bold)
    }.layoutWeight(1).alignItems(HorizontalAlign.Start)
  }

  @Builder metric(title: string, value: string) {
    Column({ space: this.r(6) }) {
      Text(title).lineHeight(this.r(34)).fontSize(this.r(22)).fontColor(this.secondary()).fontWeight(FontWeight.Normal)
      Text(value).lineHeight(this.r(42)).fontSize(this.r(28)).fontColor(this.ink()).fontWeight(FontWeight.Bold)
    }.layoutWeight(1)
  }

  @Builder train() {
    ForEach(this.currentStore()!.plans, (plan: Plan) => {
      Column() {
        Row({ space: this.r(16) }) {
          Text(plan.name).fontSize(this.r(42)).fontColor(this.ink()).fontWeight(FontWeight.Bold)
          if (plan.id === this.currentStore()!.settings.defaultPlanId) {
            Text('默认').fontSize(this.r(22)).fontWeight(FontWeight.Medium).fontColor(this.accent())
              .padding({ top: this.r(4), bottom: this.r(4), left: this.r(16), right: this.r(16) })
              .border({ width: this.r(2), color: this.accent(), radius: this.r(40) })
          }
          Blank()
          Text(formatPlanDuration(plan) + ' ›').fontSize(this.r(28)).fontColor(this.secondary()).fontWeight(FontWeight.Medium)
        }.width('100%')
        Text(plan.desc).fontSize(this.r(28)).lineHeight(this.r(42)).fontColor(this.secondary())
          .margin({ top: this.r(16) })
        Row() {
          this.metric('收紧', plan.contract + '秒')
          this.metric('放松', plan.relax + '秒')
          this.metric('次数', plan.reps + ' 次')
          this.metric('组数', plan.sets + ' 组')
        }.width('100%').backgroundColor(this.deep()).borderRadius(this.r(20))
          .padding({ top: this.r(20), bottom: this.r(20), left: this.r(12), right: this.r(12) })
          .margin({ top: this.r(28) })
      }.width('100%').alignItems(HorizontalAlign.Start).padding(this.r(40))
        .border({ width: this.r(2), color: plan.id === this.currentStore()!.settings.defaultPlanId ? this.accent() : this.rule(),
          radius: this.r(36) }).backgroundColor(this.soft()).margin({ bottom: this.r(28) })
        .onClick(() => this.start(plan))
    }, (plan: Plan) => plan.id + this.revision)
    Text(this.guide ? '收起动作要领' : '第一次练？查看动作要领').fontSize(this.r(26)).fontColor(this.muted())
      .width('100%').textAlign(TextAlign.Center).margin({ top: this.r(8) })
      .padding({ top: this.r(20), bottom: this.r(20) }).onClick(() => { this.guide = !this.guide; })
    if (this.guide) {
      Text('呼气时轻轻向上收紧，保持腹部与臀部自然放松；吸气时完全放松，不必屏气，跟着节拍走即可。')
        .fontSize(this.r(26)).lineHeight(this.r(40)).fontColor(this.secondary()).width('100%')
        .padding({ top: this.r(28), bottom: this.r(28), left: this.r(32), right: this.r(32) })
        .backgroundColor(this.soft()).border({ width: this.r(2), color: this.rule(), radius: this.r(28) })
    }
  }

  historyStat(index: number): number {
    const store = this.currentStore()!;
    if (index === 0) return store.streak.current;
    if (index === 1) return store.totalDays();
    return store.totalCompleted();
  }

  @Builder stat(index: number, title: string) {
    Column({ space: this.r(8) }) {
      Text(this.historyStat(index).toString()).fontSize(this.r(56)).fontColor(this.color('#C8402E', '#F26B5F')).fontWeight(FontWeight.Bold)
      Text(title).fontSize(this.r(28)).fontColor(this.muted()).fontWeight(FontWeight.Normal)
    }.layoutWeight(1)
  }

  @Builder history() {
    Row() {
      this.stat(0, '连续天')
      this.stat(1, '训练天')
      this.stat(2, '完成组数')
    }.width('100%').padding({ bottom: this.r(32) }).border({ width: { bottom: this.r(2) }, color: this.rule() })
    Row() {
      this.monthButton('‹', -1)
      Text(this.year + ' · ' + pad2(this.month + 1)).fontSize(this.r(36)).fontColor(this.ink()).fontWeight(FontWeight.Bold)
      this.monthButton('›', 1)
    }.width('100%').justifyContent(FlexAlign.SpaceBetween).margin({ top: this.r(40), bottom: this.r(24) })
    Row() {
      ForEach(DAYS, (day: string) => {
        Text(day).layoutWeight(1).textAlign(TextAlign.Center).fontSize(this.r(24))
          .fontWeight(FontWeight.Medium).fontColor(this.secondary())
      })
    }.width('100%').margin({ bottom: this.r(16) })
    ForEach(this.weeks(), (week: number) => {
      Row() {
        ForEach(INDICES, (index: number) => {
          Column() {
            if (this.calendarDay(week, index) >= 1 &&
              this.calendarDay(week, index) <= new Date(this.year, this.month + 1, 0).getDate()) {
              this.calendarCell(this.calendarDay(week, index), this.calendarKey(this.calendarDay(week, index)))
            }
          }.layoutWeight(1).height(this.r(94)).padding(this.r(8))
        })
      }.width('100%')
    }, (week: number) => week + '-' + this.year + '-' + this.month + '-' + this.selected + '-' + this.revision)
    if (this.selected) {
      this.detail()
    }
  }

  @Builder monthButton(title: string, delta: number) {
    Text(title).width(this.r(76)).height(this.r(76)).textAlign(TextAlign.Center)
      .fontColor(this.secondary()).fontSize(this.r(40)).onClick(() => this.moveMonth(delta))
  }

  @Builder calendarCell(day: number, key: string) {
    Column() {
      Text(day.toString()).fontSize(this.r(24)).fontColor(this.currentStore()!.heat(key) === 3 ? this.onButton() : this.ink()).fontWeight(key === todayKey() ? FontWeight.Bold : FontWeight.Medium)
      if ((this.currentStore()!.day(key)?.sessions.length ?? 0) > 0) {
        Text(this.currentStore()!.completed(key) > 0 ? this.currentStore()!.completed(key) + '组' : '部分').fontSize(this.r(18)).fontColor(this.currentStore()!.heat(key) === 3 ? this.onButton() : this.secondary()).fontWeight(FontWeight.Medium)
      } else if (key === todayKey()) {
        Circle().width(this.r(10)).height(this.r(10)).fill(this.accent()).margin({ top: this.r(4) })
      }
    }.width('100%').height('100%').justifyContent(FlexAlign.Center).backgroundColor(this.heat(this.currentStore()!.heat(key)))
      .opacity(key > todayKey() ? 0.32 : 1)
      .border({ width: this.r(this.selected === key ? 4 : 2), color: this.selected === key ? this.ink() : this.rule(),
        radius: this.r(16) }).onClick(() => { if (key <= todayKey()) this.selected = key; })
  }

  dayGoal(key: string): number {
    return this.currentStore()!.day(key)?.goalGroups ?? (key === todayKey() ? this.goal() : 0);
  }

  @Builder detail() {
    Column() {
      Row() {
        Text(this.selected.slice(5).replace('-', '.') + (this.selected === todayKey() ? ' · 今天' : '')).fontSize(this.r(34)).fontColor(this.ink()).fontWeight(FontWeight.Bold)
        Blank()
        Text(this.dayGoal(this.selected) > 0 ? '已完成 ' + this.currentStore()!.completed(this.selected) + ' / ' + this.dayGoal(this.selected) + ' 组' :
          '未训练').fontSize(this.r(26)).fontColor(this.secondary()).fontWeight(FontWeight.Medium)
      }.width('100%')
      if ((this.currentStore()!.day(this.selected)?.sessions.length ?? 0) > 0) {
        ForEach(this.currentStore()!.day(this.selected)?.sessions ?? [], (session: Session, index: number) => {
          Row() {
            Column({ space: this.r(8) }) {
              Text(this.currentStore()!.planName(session.planId) + ' · ' + session.completedReps + ' 次').fontSize(this.r(32)).fontColor(this.ink()).fontWeight(FontWeight.Medium)
              Text(formatDuration(session.durationSec) + ' · ' + formatClock(session.ts)).fontSize(this.r(26)).fontColor(this.secondary()).fontWeight(FontWeight.Normal)
            }.alignItems(HorizontalAlign.Start)
            Blank()
            Text(session.finished ? '完成' : '部分').fontSize(this.r(28)).fontColor(session.finished ? this.relax() : this.muted()).fontWeight(FontWeight.Bold)
          }.width('100%').padding({ top: this.r(24), bottom: this.r(index + 1 ===
            this.currentStore()!.day(this.selected)?.sessions.length ? 0 : 24) })
            .border({ width: { bottom: index + 1 === this.currentStore()!.day(this.selected)?.sessions.length ? 0 : this.r(2) },
              color: this.rule() })
        }, (session: Session, index: number) => this.selected + '-' + session.ts + '-' + index)
      } else if (this.selected === todayKey()) {
        Row() {
          Text('今天还没留下足迹。').fontSize(this.r(28)).fontColor(this.secondary()).fontWeight(FontWeight.Normal)
          Blank()
          Text('去训练 →').fontSize(this.r(28)).fontWeight(FontWeight.Bold).fontColor(this.onButton())
            .backgroundColor(this.buttonColor()).borderRadius(this.r(40))
            .padding({ left: this.r(32), right: this.r(32), top: this.r(16), bottom: this.r(16) })
            .onClick(() => this.start(this.currentStore()!.activePlan()))
        }.width('100%').margin({ top: this.r(24) })
      } else {
        Text('这一天没有记录。安静的一天。').fontSize(this.r(28)).fontColor(this.secondary()).margin({ top: this.r(24) })
      }
    }.width('100%').alignItems(HorizontalAlign.Start).padding(this.r(32)).backgroundColor(this.soft())
      .border({ width: this.r(2), color: this.rule(), radius: this.r(36) }).margin({ top: this.r(40) })
  }

  @Builder section(title: string, first: boolean = false) {
    Text(title).fontSize(this.r(24)).fontColor(this.muted()).fontWeight(FontWeight.Medium)
      .letterSpacing(this.r(1)).margin({ top: first ? 0 : this.r(48), bottom: this.r(16) })
  }

  @Builder settingTitle(title: string, description: string) {
    Column({ space: this.r(8) }) {
      Text(title).fontSize(this.r(32)).fontColor(this.ink()).fontWeight(FontWeight.Medium)
      Text(description).fontSize(this.r(28)).lineHeight(this.r(41)).fontColor(this.muted())
    }.layoutWeight(1).alignItems(HorizontalAlign.Start).padding({ right: this.r(20) })
  }

  @Builder step(title: string, delta: number) {
    Text(title).fontSize(this.r(44)).fontWeight(FontWeight.Medium).fontColor(this.ink())
      .padding({ top: this.r(16), bottom: this.r(16), left: this.r(32), right: this.r(32) })
      .opacity(this.goal() + delta >= 1 && this.goal() + delta <= 8 ? 1 : 0.4)
      .onClick(() => this.changeGoal(delta))
  }

  toggleValue(key: 'sound' | 'haptics' | 'dailyQuote'): boolean {
    const settings = this.currentStore()!.settings;
    if (key === 'sound') return settings.sound;
    if (key === 'haptics') return settings.haptics;
    return settings.dailyQuote;
  }

  @Builder toggle(title: string, description: string, key: 'sound' | 'haptics' | 'dailyQuote', action: () => void) {
    Row() {
      this.settingTitle(title, description)
      Row() {
        Circle().width(this.r(46)).height(this.r(46)).fill(Color.White)
      }.width(this.r(96)).height(this.r(56)).padding(this.r(4))
        .justifyContent(this.toggleValue(key) ? FlexAlign.End : FlexAlign.Start)
        .backgroundColor(this.toggleValue(key) ? this.buttonColor() : this.deep())
        .border({ width: this.r(2), color: this.toggleValue(key) ? this.buttonColor() : this.strong(), radius: this.r(28) })
    }.width('100%').constraintSize({ minHeight: this.r(148) })
      .padding({ top: this.r(20), bottom: this.r(20) }).onClick(action)
  }

  @Builder settings() {
    this.section('每日目标', true)
    Row() {
      this.settingTitle('每天几组', '连续达标即计入连续天数')
      Row() {
        this.step('−', -1)
        Text(this.goal().toString()).fontSize(this.r(56)).fontColor(this.ink()).fontWeight(FontWeight.Bold)
          .width(this.r(56)).textAlign(TextAlign.Center)
        this.step('+', 1)
      }.border({ width: this.r(2), color: this.strong(), radius: this.r(46) })
    }.width('100%').constraintSize({ minHeight: this.r(148) }).padding({ left: this.r(32), right: this.r(32),
      top: this.r(20), bottom: this.r(20) }).backgroundColor(this.card())
      .border({ width: this.r(2), color: this.rule(), radius: this.r(36) })
    this.section('默认方案')
    Column() {
      Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.SpaceBetween }) {
        ForEach(this.currentStore()!.plans, (plan: Plan) => {
          Text(plan.name).width('48%').textAlign(TextAlign.Center).fontSize(this.r(30)).fontWeight(FontWeight.Bold)
            .padding({ top: this.r(24), bottom: this.r(24) }).margin({ bottom: this.r(18) })
            .fontColor(plan.id === this.currentStore()!.settings.defaultPlanId ? this.onButton() : this.ink())
            .backgroundColor(plan.id === this.currentStore()!.settings.defaultPlanId ? this.buttonColor() : this.deep())
            .border({ width: this.r(2), color: this.rule(), radius: this.r(46) })
            .onClick(() => { this.currentStore()!.settings.defaultPlanId = plan.id; this.saveSettings(); })
        }, (plan: Plan) => plan.id + this.revision)
      }.width('100%')
      Text('用于今日页一键开练').fontSize(this.r(24)).fontColor(this.muted()).margin({ top: this.r(6) })
    }.width('100%').alignItems(HorizontalAlign.Start).padding(this.r(48)).backgroundColor(this.card())
      .border({ width: this.r(2), color: this.rule(), radius: this.r(36) })
    this.section('体验')
    Column() {
      this.toggle('声音', '收 / 放 切换时播放轻提示音', 'sound', () => {
        this.currentStore()!.settings.sound = !this.currentStore()!.settings.sound;
        this.saveSettings();
      })
      Divider().color(this.rule()).strokeWidth(this.r(2))
      this.toggle('触感反馈', '阶段切换时轻震一下', 'haptics', () => {
        this.currentStore()!.settings.haptics = !this.currentStore()!.settings.haptics;
        this.saveSettings();
      })
      Divider().color(this.rule()).strokeWidth(this.r(2))
      this.toggle('每日一句', '首页显示一句鼓励', 'dailyQuote', () => {
        this.currentStore()!.settings.dailyQuote = !this.currentStore()!.settings.dailyQuote;
        this.saveSettings();
      })
    }.width('100%').padding({ left: this.r(32), right: this.r(32) }).backgroundColor(this.card())
      .border({ width: this.r(2), color: this.rule(), radius: this.r(36) })
    this.section('外观')
    Row() {
      ForEach(THEMES, (theme: ThemeSetting, index: number) => {
        Text(THEME_NAMES[index]).textAlign(TextAlign.Center).layoutWeight(1)
          .fontSize(this.r(28)).fontWeight(FontWeight.Medium).borderRadius(this.r(38))
          .padding({ top: this.r(24), bottom: this.r(24) })
          .fontColor(theme === this.currentStore()!.settings.theme ? this.onButton() : this.ink())
          .backgroundColor(theme === this.currentStore()!.settings.theme ? this.buttonColor() : this.card())
          .onClick(() => { this.currentStore()!.settings.theme = theme; this.saveSettings(); })
      }, (theme: ThemeSetting) => theme + this.revision)
    }.width('100%').padding(this.r(8)).backgroundColor(this.card())
      .border({ width: this.r(2), color: this.rule(), radius: this.r(46) })
    this.section('数据')
    Column() {
      Text('导出我的数据').height(this.r(92)).width('100%').textAlign(TextAlign.Center)
        .fontSize(this.r(32)).fontWeight(FontWeight.Medium).fontColor(this.ink())
        .backgroundColor(this.deep()).borderRadius(this.r(46)).opacity(this.currentStore()!.totalDays() > 0 ? 1 : 0.45)
        .onClick(() => this.exportBackup())
      Text(this.currentStore()!.totalDays() > 0 ?
        '本机已记录 ' + this.currentStore()!.totalDays() + ' 天、完成 ' + this.currentStore()!.totalCompleted() + ' 组' :
        '本机还没有训练记录，完成一次训练后即可导出备份')
        .fontSize(this.r(26)).lineHeight(this.r(40)).fontColor(this.muted()).margin({ top: this.r(16) })
      Divider().color(this.rule()).strokeWidth(this.r(2)).margin({ top: this.r(32) })
      Row() {
        this.settingTitle('清空记录与设置', '删除后无法恢复，建议先导出备份')
        Text('清空').fontSize(this.r(28)).fontColor(this.color('#C83328', '#FF7B70')).fontWeight(FontWeight.Bold)
      }.width('100%').constraintSize({ minHeight: this.r(148) }).padding({ top: this.r(20), bottom: this.r(20) })
        .onClick(() => this.confirmClear())
    }.width('100%').alignItems(HorizontalAlign.Start).padding(this.r(48)).backgroundColor(this.card())
      .border({ width: this.r(2), color: this.rule(), radius: this.r(36) })
    this.section('开源')
    Row() {
      this.settingTitle('GitHub · 欢迎 Star', 'github.com/chen893/tilemo')
      Text('复制').fontSize(this.r(28)).fontColor(this.secondary()).fontWeight(FontWeight.Normal)
    }.width('100%').constraintSize({ minHeight: this.r(148) })
      .padding({ left: this.r(32), right: this.r(32), top: this.r(20), bottom: this.r(20) })
      .backgroundColor(this.card()).border({ width: this.r(2), color: this.rule(), radius: this.r(36) })
      .onClick(() => this.copy('https://github.com/chen893/tilemo', '仓库地址已复制'))
    Text('提了么 0.1.0\n数据保存在本机，只有你打开应用时才会读取。')
      .fontSize(this.r(24)).lineHeight(this.r(41)).fontColor(this.muted())
      .margin({ top: this.r(56) }).padding({ bottom: this.r(24) })
  }

  @Builder controls(label: string, style: string, action: () => void) {
    Text(label).width(this.r(style === 'weak' ? 160 : 248)).height(this.r(92)).textAlign(TextAlign.Center)
      .fontSize(this.r(32)).fontWeight(FontWeight.Medium)
      .fontColor(style === 'primary' ? this.onButton() : style === 'weak' ? this.muted() : this.ink())
      .backgroundColor(style === 'primary' ? this.buttonColor() : style === 'soft' ? this.soft() : Color.Transparent)
      .border({ width: this.r(2), radius: this.r(46),
        color: style === 'weak' ? Color.Transparent : style === 'primary' ? this.buttonColor() : this.strong() })
      .onClick(action)
  }

  @Builder player() {
    Column() {
      Text(this.plan!.name + ' · ' + formatPlanDuration(this.plan!)).fontSize(this.r(28))
        .fontWeight(FontWeight.Medium).fontColor(this.secondary()).margin({ top: this.r(64) })
      Column() {
        // 小熊猫 Canvas 舞台全程保持挂载，确保 prep / breath / done 无缝阻尼过渡
        Canvas(this.pandaCanvas)
          .width(this.r(this.snapshot!.stage === 'done' ? 380 : 480))
          .height(this.r(this.snapshot!.stage === 'done' ? 380 : 480))
          .onReady(() => {
            this.pandaReady = true;
            this.pandaLastTs = Date.now();
            this.renderPandaFrame();
          })

        if (this.snapshot!.stage === 'prep') {
          Text(getPandaCopy(this.snapshot!, this.plan!.contract).pillText)
            .fontSize(this.r(28)).fontWeight(FontWeight.Bold).fontColor(this.ink())
            .backgroundColor(this.soft()).border({ width: this.r(2), radius: this.r(40), color: this.strong() })
            .padding({ left: this.r(32), right: this.r(32), top: this.r(10), bottom: this.r(10) })
            .margin({ top: this.r(16) })
          Text(this.snapshot!.prepN.toString()).fontSize(this.r(128)).lineHeight(this.r(136)).fontColor(this.accent())
            .fontWeight(FontWeight.Bold).margin({ top: this.r(16) })
          Text(getPandaCopy(this.snapshot!, this.plan!.contract).cueText)
            .fontSize(this.r(28)).fontColor(this.secondary()).textAlign(TextAlign.Center).margin({ top: this.r(20) })
        } else if (this.snapshot!.stage === 'breath') {
          Row({ space: this.r(24) }) {
            Text(getPandaCopy(this.snapshot!, this.plan!.contract).pillText)
              .fontSize(this.r(30)).fontWeight(FontWeight.Bold)
              .fontColor(this.snapshot!.state === 'paused' ? this.ink() : this.onButton())
              .backgroundColor(this.snapshot!.state === 'paused' ? this.soft() : this.snapshot!.phase === 'contract' ? this.buttonColor() : this.relax())
              .border({ width: this.r(2), radius: this.r(40), color: this.snapshot!.state === 'paused' ? this.strong() : Color.Transparent })
              .padding({ left: this.r(32), right: this.r(32), top: this.r(12), bottom: this.r(12) })
            Row({ space: this.r(6) }) {
              Text(this.snapshot!.state === 'paused' ? '—' : this.snapshot!.remaining.toString())
                .fontSize(this.r(96)).fontWeight(FontWeight.Bold)
                .fontColor(this.snapshot!.state === 'paused' ? this.secondary() : this.snapshot!.phase === 'contract' ? this.accent() : this.relax())
              if (this.snapshot!.state !== 'paused') {
                Text('秒').fontSize(this.r(32)).fontColor(this.muted()).fontWeight(FontWeight.Medium)
              }
            }.alignItems(VerticalAlign.Bottom)
          }.alignItems(VerticalAlign.Center).margin({ top: this.r(24) })
          Text(getPandaCopy(this.snapshot!, this.plan!.contract).cueText)
            .fontSize(this.r(28)).fontColor(this.secondary()).textAlign(TextAlign.Center).margin({ top: this.r(20) })
          Text((this.snapshot!.sets > 1 ? '第 ' + (this.snapshot!.setIdx + 1) + '/' + this.snapshot!.sets + ' 组 · ' : '') +
            this.snapshot!.startedReps + ' / ' + this.snapshot!.totalReps + ' 次')
            .fontSize(this.r(26)).fontColor(this.muted()).margin({ top: this.r(18) })
        } else {
          Text('今天，提了。').fontSize(this.r(72)).fontWeight(FontWeight.Bold).fontColor(this.ink())
            .margin({ top: this.r(16) })
          Text(this.snapshot!.doneSub).fontSize(this.r(28)).fontColor(this.secondary()).margin({ top: this.r(20) })
          Text('今日 ' + this.done() + ' / ' + this.goal() + ' 组')
            .fontSize(this.r(28)).fontWeight(FontWeight.Medium).fontColor(this.ink()).backgroundColor(this.soft())
            .border({ width: this.r(2), color: this.rule(), radius: this.r(28) })
            .padding({ left: this.r(40), right: this.r(40), top: this.r(18), bottom: this.r(18) })
            .margin({ top: this.r(32) })
        }
      }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
        .padding({ left: this.r(48), right: this.r(48) })
      Row({ space: this.r(28) }) {
        if (this.snapshot!.stage === 'prep') {
          this.controls('取消', 'plain', () => this.finish(false))
        } else if (this.snapshot!.stage === 'breath') {
          if (this.snapshot!.state === 'paused') {
            this.controls('继续训练', 'primary', () => this.metro?.togglePause())
          } else {
            this.controls('暂停', 'soft', () => this.metro?.togglePause())
          }
          this.controls('结束', 'weak', () => this.finish(false))
        } else {
          this.controls('分享这次', 'plain', () => this.finish(true))
          this.controls('返回今日', 'primary', () => this.finish(false))
        }
      }.width('100%').justifyContent(FlexAlign.Center)
        .padding({ top: this.r(32), bottom: this.r(128) }).border({ width: { top: this.r(2) }, color: this.rule() })
    }.width('100%').height('100%').backgroundColor(this.paper())
  }

  @Builder tabs() {
    Row() {
      ForEach(TABS, (title: string, index: number) => {
        Column({ space: 2 }) {
          Image($rawfile('tab/' + ICONS[index] + (this.dark() ? '-d' : '') + (this.tab === index ? '-on' : '') + '.png'))
            .width(24).height(24)
          Text(title).fontSize(10).fontColor(this.tab === index ? this.accent() : this.color('#6F5F50', '#A09080'))
        }.layoutWeight(1).height('100%').justifyContent(FlexAlign.Center).onClick(() => { this.tab = index; if (index === 3 && !this.backupSharing) this.cleanBackupFiles(); })
      })
    }.width('100%').height(50).backgroundColor(this.soft()).border({ width: { top: 0.5 }, color: this.rule() })
  }

  pickQuote(seed: number): string {
    return QUOTES[seed % QUOTES.length];
  }

  context(): common.UIAbilityContext {
    return this.getUIContext().getHostContext() as common.UIAbilityContext;
  }

  exportBackup(): void {
    if (this.currentStore()!.totalDays() === 0) {
      this.toast('暂无可导出的训练记录');
      return;
    }
    this.getUIContext().getPromptAction().showActionMenu({
      title: '',
      buttons: [{ text: '发送备份文件到聊天', color: this.ink() }, { text: '复制备份文本', color: this.ink() }]
    }).then(result => {
      if (result.index === 0) this.shareBackup();
      else if (result.index === 1) this.copy(this.currentStore()!.exportText(), '已复制 ' + this.currentStore()!.totalDays() + ' 天记录');
    }).catch(() => {});
  }

  async shareFile(path: string, type: string): Promise<void> {
    const data = new systemShare.SharedData({ utd: type, uri: fileUri.getUriFromPath(path) });
    const controller = new systemShare.ShareController(data);
    await new Promise<void>((resolve, reject) => {
      const dismiss = (): void => {
        controller.off('dismiss', dismiss);
        resolve();
      };
      controller.on('dismiss', dismiss);
      controller.show(this.context(), { selectionMode: systemShare.SelectionMode.SINGLE }).catch((error: BusinessError) => {
        controller.off('dismiss', dismiss);
        reject(error);
      });
    });
  }

  cleanBackupFiles(): void {
    const directory = this.context().cacheDir;
    try {
      for (const name of fileIo.listFileSync(directory)) {
        if (/^tgm-data-\d{4}-\d{2}-\d{2}\.json$/.test(name)) fileIo.unlinkSync(directory + '/' + name);
      }
    } catch {
      this.toast('备份文件清理失败，请在设置中重试');
    }
  }

  async shareBackup(): Promise<void> {
    if (this.backupSharing) return;
    this.backupSharing = true;
    const path = this.context().cacheDir + '/tgm-data-' + todayKey() + '.json';
    try {
      const file = fileIo.openSync(path, fileIo.OpenMode.CREATE | fileIo.OpenMode.WRITE_ONLY | fileIo.OpenMode.TRUNC);
      try {
        fileIo.writeSync(file.fd, this.currentStore()!.exportText());
      } finally {
        fileIo.closeSync(file);
      }
      await this.shareFile(path, 'general.json');
    } catch {
      this.toast('发送失败，可选择复制备份文本');
    } finally {
      this.backupSharing = false;
      this.cleanBackupFiles();
    }
  }

  openShare(type: string): void {
    this.ready = false;
    this.shareType = type;
  }

  cardText(text: string, x: number, y: number, size: number, color: string, bold: boolean, align: CanvasTextAlign): void {
    this.canvas.font = (bold ? 'bold ' : '') + size + 'vp sans-serif';
    this.canvas.fillStyle = color;
    this.canvas.textAlign = align;
    this.canvas.fillText(text, x, y, 888);
  }

  cardRect(x: number, y: number, width: number, height: number, radius: number, color: string, outline: string): void {
    this.canvas.beginPath();
    this.canvas.roundRect(x, y, width, height, radius);
    this.canvas.fillStyle = color;
    this.canvas.fill();
    if (outline) {
      this.canvas.strokeStyle = outline;
      this.canvas.stroke();
    }
  }

  paintCard(): void {
    const ctx = this.canvas;
    const scale = this.r(540) / 1080;
    const streak = this.currentStore()!.streak.current;
    const seed = new Date().getDate();
    const muted = this.color('#6F5F50', '#A09080');
    const secondary = this.color('#5C4F47', '#C4B5A6');
    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = this.paper();
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.textBaseline = 'top';
    if (this.shareType === 'review') {
      this.cardText(REVIEW_LINES[seed % REVIEW_LINES.length], 96, 92, 52, this.ink(), true, 'left');
      for (let index = 0; index < 30; index++) {
        const level = this.currentStore()!.heat(ymd(this.dateAgo(29 - index)));
        const lit = streak === 0 && index === 29;
        ctx.lineWidth = lit ? 3 : 1;
        this.cardRect(175 + index % 6 * 124, 264 + Math.floor(index / 6) * 124, 110, 110, 24.2,
          lit || level === 3 ? this.accent() : level === 0 ? this.deep() : this.heat(level),
          lit ? this.accent() : this.color('rgba(43,35,32,0.12)', 'rgba(242,232,220,0.14)'));
      }
      this.cardText(streak > 0 ? '连续 ' + streak + ' 天' : '从今天，开始打卡',
        540, 910, 44, this.accent(), true, 'center');
    } else if (this.shareType === 'milestone') {
      this.cardText('DAY ' + MILESTONES[this.milestone], 540, 286, 104, this.accent(), true, 'center');
      this.cardText(MILESTONE_LINES[this.milestone], 540, 450, 56, this.ink(), true, 'center');
      const badge = BADGES[this.milestone];
      const width = badge.length * 32 + 80;
      this.cardRect(540 - width / 2, 600, width, 64, 32, this.accent(), '');
      this.cardText(badge, 540, 614, 32, '#FFFFFF', true, 'center');
      this.cardText('连续 ' + streak + ' 天', 540, 726, 30, muted, false, 'center');
      this.cardText('「' + this.pickQuote(seed) + '」', 540, 860, 30, secondary, false, 'center');
    } else {
      const sessions = this.currentStore()!.day(todayKey())?.sessions.length ?? 0;
      this.cardText('今天', 96, 92, 30, muted, true, 'left');
      this.cardText(sessions >= this.goal() ? '今天，提了。' : '又稳了一点。', 96, 146, 58, this.ink(), true, 'left');
      this.cardText(streak.toString(), 540, 320, 190, this.accent(), true, 'center');
      this.cardText('连续天数', 540, 540, 30, muted, false, 'center');
      this.cardText('今日  ' + sessions + ' / ' + this.goal() + ' 组', 540, 645, 30, secondary, false, 'center');
      this.cardRect(96, 690, 888, 14, 7, this.deep(), '');
      if (sessions > 0) this.cardRect(96, 690, 888 * Math.min(1, sessions / this.goal()), 14, 7, this.accent(), '');
      this.cardText('「' + this.pickQuote(seed) + '」', 540, 820, 30, secondary, false, 'center');
    }
    this.cardText('今天，提了么', 984, 1182, 38, this.ink(), true, 'right');
    this.cardText('鸿蒙应用 · 提了么', 96, 1264, 26, muted, false, 'left');
    ctx.restore();
    this.ready = true;
  }

  async sendCard(save: boolean): Promise<void> {
    if (this.saving || this.sharing || !this.ready) return;
    this.saving = save;
    this.sharing = !save;
    const context = this.context();
    const path = context.cacheDir + '/tilemo-card.png';
    try {
      const pixel = await this.getUIContext().getComponentSnapshot().get('tilemo-card', { scale: 1080 / this.getUIContext().vp2px(this.r(540)) });
      const packer = image.createImagePacker();
      const file = fileIo.openSync(path, fileIo.OpenMode.CREATE | fileIo.OpenMode.WRITE_ONLY | fileIo.OpenMode.TRUNC);
      try {
        await packer.packToFile(pixel, file.fd, { format: 'image/png', quality: 100 });
      } finally {
        fileIo.closeSync(file);
        await packer.release();
        await pixel.release();
      }
      if (save) {
        const helper = photoAccessHelper.getPhotoAccessHelper(context);
        const assets = await helper.showAssetsCreationDialog([fileUri.getUriFromPath(path)],
          [{ title: '提了么', fileNameExtension: 'png', photoType: photoAccessHelper.PhotoType.IMAGE }]);
        if (assets.length > 0) {
          const photo = fileIo.openSync(assets[0], fileIo.OpenMode.WRITE_ONLY);
          try {
            await fileIo.copyFile(path, photo.fd);
          } finally {
            fileIo.closeSync(photo);
          }
          this.toast('已保存到相册');
        }
      } else {
        await this.shareFile(path, 'general.png');
      }
    } catch {
      this.toast(save ? '未保存到相册' : '分享失败');
    } finally {
      try { fileIo.unlinkSync(path); } catch {}
      this.saving = false;
      this.sharing = false;
    }
  }

  @Builder sharePanel() {
    Stack() {
      Row().width('100%').height('100%').backgroundColor('#8C14100E').onClick(() => { this.shareType = ''; })
      Column() {
        Row() {
          Text(this.shareType === 'review' ? '回顾' : this.shareType === 'milestone' ? '里程碑' : '今日').fontSize(this.r(32)).fontColor(this.ink()).fontWeight(FontWeight.Medium)
          Blank()
          Text('×').width(this.r(64)).height(this.r(64)).textAlign(TextAlign.Center).fontSize(this.r(36))
            .fontColor(this.secondary()).border({ width: this.r(2), color: this.strong(), radius: this.r(32) })
            .onClick(() => { this.shareType = ''; })
        }.width('100%').margin({ bottom: this.r(24) })
        Scroll() {
          Canvas(this.canvas).id('tilemo-card').width(this.r(540)).height(this.r(675))
            .borderRadius(this.r(16)).clip(true).onReady(() => this.paintCard())
        }.width('100%').constraintSize({ maxHeight: '68%' }).scrollBar(BarState.Off)
          .margin({ bottom: this.r(28) })
        Text(this.saving ? '保存中…' : '保存到相册').fontSize(this.r(32)).fontWeight(FontWeight.Bold).fontColor(this.onButton())
      .height(this.r(92)).width('100%').textAlign(TextAlign.Center)
      .backgroundColor(this.buttonColor()).borderRadius(this.r(46)).enabled(this.ready && !this.saving && !this.sharing)
          .onClick(() => this.sendCard(true))
        Text('转发给朋友').width('100%').height(this.r(92)).textAlign(TextAlign.Center)
          .fontSize(this.r(32)).fontWeight(FontWeight.Bold).fontColor(this.ink())
          .border({ width: this.r(2), color: this.strong(), radius: this.r(46) }).margin({ top: this.r(24) })
          .enabled(this.ready && !this.saving && !this.sharing).onClick(() => this.sendCard(false))
      }.width(this.r(654)).padding(this.r(32)).backgroundColor(this.paper()).borderRadius(this.r(36))
    }.width('100%').height('100%')
  }

  build() {
    Column() {
      Text(this.tab === 0 ? '今天，提了么' : TABS[this.tab]).height(44).width('100%')
        .textAlign(TextAlign.Center).fontSize(17).fontWeight(FontWeight.Medium)
        .fontColor(this.dark() ? '#FFFFFF' : '#000000')
      Stack() {
        Column() {
          if (this.revision > 0) {
            Scroll() {
              Column() {
                if (this.tab === 0) this.home()
                else if (this.tab === 1) this.train()
                else if (this.tab === 2) this.history()
                else this.settings()
              }.width('100%').alignItems(HorizontalAlign.Start)
                .padding({ top: this.r(64), bottom: this.r(96), left: this.r(48), right: this.r(48) })
            }.width('100%').layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off)
            this.tabs()
          }
        }.width('100%').height('100%')
          .accessibilityLevel(this.shareType || (this.snapshot && this.snapshot.state !== 'idle') ?
            'no-hide-descendants' : 'auto')
        if (this.snapshot && this.snapshot.state !== 'idle') {
          this.player()
        }
        if (this.shareType) {
          this.sharePanel()
        }
      }.width('100%').layoutWeight(1)
    }.width('100%').height('100%').backgroundColor(this.paper())
      .onAreaChange((_, area: Area) => { this.viewportWidth = Number(area.width); })
  }
}
