import { SelectableEntity } from '../entities/types.js';
import { Unit } from '../entities/unit.js';
import { Building } from '../entities/building.js';
import { ICONS } from './icons.js';

export type OrderType =
  | 'move' | 'attack' | 'patrol' | 'stop' | 'defend' | 'gather'
  | 'recruit_worker' | 'recruit_guard' | 'recruit_buggy' | 'recruit_mech' | 'recruit_drone'
  | 'rally' | 'repair' | 'research' | 'disperse';

export type EventType = 'info' | 'aviso' | 'perigo' | 'sistema';

export type PingKind = 'move' | 'attack' | 'defend';

export type ResourceKey = 'rations' | 'scrap' | 'chips' | 'concrete';

export interface ProductionItem {
  id: string;
  label: string;
  cost: string;
  progress: number;
}

export interface HudOrderCallbacks {
  onOrder: (order: OrderType, entityIds: string[]) => void;
  onPortraitClick?: (entityId: string) => void;
  onCancelProduction?: (itemId: string) => void;
}

export interface HudMinimapCallbacks {
  onMoveCamera: (normalizedX: number, normalizedY: number) => void;
  onIssueOrder: (normalizedX: number, normalizedY: number) => void;
}

export interface HudTouchCallbacks {
  onTapSelect: (x: number, y: number) => void;
  onDragBox: (x0: number, y0: number, x1: number, y1: number) => void;
  onLongPressOrder: (x: number, y: number) => void;
}

interface PendingTouch {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
  moved: boolean;
  longPressFired: boolean;
  timerId: number;
}

const LONG_PRESS_MS = 550;
const DRAG_THRESHOLD_PX = 10;
const MAX_EVENTS = 30;
const EVENT_AUTO_DISMISS_MS = 9000;
const PING_LIFETIME_MS = 2000;
const MAX_PORTRAITS = 12;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class HudController {
  private selectionPanel: HTMLElement;
  private selectionMain: HTMLElement;
  private portraitsStrip: HTMLElement | null;
  private productionQueue: HTMLElement | null;
  private productionLabel: HTMLElement | null;
  private productionFill: HTMLElement | null;
  private productionList: HTMLElement | null;
  private commandsPanel: HTMLElement;
  private resRations: HTMLElement;
  private resScrap: HTMLElement;
  private resChips: HTMLElement;
  private resConcrete: HTMLElement;
  private resPop: HTMLElement;
  private currentEraName: HTMLElement;

  private eventFeed: HTMLElement | null;
  private eventList: HTMLElement | null;
  private eventBadge: HTMLElement | null;
  private unreadCount = 0;
  private feedOpen = false;

  private minimapPingLayer: HTMLElement | null;

  private lastResources: Record<ResourceKey, number> = { rations: 0, scrap: 0, chips: 0, concrete: 0 };
  private selectedIds: string[] = [];
  private productionItems: ProductionItem[] = [];
  private orderCallbacks: HudOrderCallbacks | null = null;
  private orderAvailability: ((order: OrderType) => boolean) | null = null;
  private minimapCallbacks: HudMinimapCallbacks | null = null;
  private touchCallbacks: HudTouchCallbacks | null = null;
  private pendingTouch: PendingTouch | null = null;

  constructor() {
    this.selectionPanel = document.getElementById('hud-selection-panel')!;
    this.selectionMain =
      document.getElementById('selection-card-main') ?? this.selectionPanel;
    this.portraitsStrip = document.getElementById('selection-portraits');
    this.productionQueue = document.getElementById('production-queue');
    this.productionLabel = document.getElementById('production-label');
    this.productionFill = document.getElementById('production-progress-fill');
    this.productionList = document.getElementById('production-queue-list');
    this.commandsPanel = document.getElementById('hud-commands-panel')!;
    this.resRations = document.getElementById('res-rations')!;
    this.resScrap = document.getElementById('res-scrap')!;
    this.resChips = document.getElementById('res-chips')!;
    this.resConcrete = document.getElementById('res-concrete')!;
    this.resPop = document.getElementById('res-pop')!;
    this.currentEraName = document.getElementById('current-era-name')!;

    this.eventFeed = document.getElementById('event-feed');
    this.eventList = document.getElementById('event-feed-list');
    this.eventBadge = document.getElementById('events-badge-count');
    this.minimapPingLayer = document.getElementById('minimap-ping-layer');

    this.initResourceIcons();
    this.bindCommandClicks();
    this.bindEventFeedControls();
    this.bindCollapseControl();
    this.bindProductionCancel();
    this.applyCompactModeFromViewport();
    window.addEventListener('resize', () => this.applyCompactModeFromViewport());
  }

  // ------------------------------------------------------------------
  // Callbacks externos (stubs tipados — simulação conecta aqui depois)
  // ------------------------------------------------------------------

  public bindOrderCallbacks(callbacks: HudOrderCallbacks): void {
    this.orderCallbacks = callbacks;
  }

  public bindMinimapCallbacks(callbacks: HudMinimapCallbacks): void {
    this.minimapCallbacks = callbacks;
  }

  public bindTouchCallbacks(callbacks: HudTouchCallbacks): void {
    this.touchCallbacks = callbacks;
  }

  // ------------------------------------------------------------------
  // 1.6.1 — Topbar viva
  // ------------------------------------------------------------------

  private initResourceIcons(): void {
    const setIcon = (id: string, svg: string): void => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = svg;
    };
    setIcon('res-icon-rations', ICONS.rations);
    setIcon('res-icon-scrap', ICONS.scrap);
    setIcon('res-icon-chips', ICONS.chips);
    setIcon('res-icon-concrete', ICONS.concrete);
    setIcon('res-icon-pop', ICONS.population);
    setIcon('events-bell-icon', ICONS.bell);
    setIcon('era-icon', ICONS.era);
    setIcon('collapse-icon', ICONS.chevronDown);

    const menuBtn = document.getElementById('btn-open-menu-ingame');
    if (menuBtn) menuBtn.innerHTML = ICONS.menu;
  }

  private updateResourceValue(
    key: ResourceKey,
    valueEl: HTMLElement,
    next: number
  ): void {
    const prev = this.lastResources[key];
    valueEl.textContent = next.toString();
    this.lastResources[key] = next;

    const item = valueEl.closest('.resource-item');
    const deltaEl = document.getElementById(`res-delta-${key}`);
    if (!item || !deltaEl) return;

    const diff = next - prev;
    item.classList.remove('res-flash-up', 'res-flash-down');
    // Força reflow para reiniciar a animação CSS.
    void (item as HTMLElement).offsetWidth;
    if (diff > 0) {
      item.classList.add('res-flash-up');
      deltaEl.textContent = `+${diff}`;
      deltaEl.classList.remove('down');
      deltaEl.classList.add('show', 'up');
    } else if (diff < 0) {
      item.classList.add('res-flash-down');
      deltaEl.textContent = `${diff}`;
      deltaEl.classList.remove('up');
      deltaEl.classList.add('show', 'down');
    } else {
      deltaEl.classList.remove('show', 'up', 'down');
      return;
    }
    window.setTimeout(() => deltaEl.classList.remove('show'), 1600);
  }

  public setResources(rations: number, scrap: number, chips: number, concrete: number): void {
    this.updateResourceValue('rations', this.resRations, rations);
    this.updateResourceValue('scrap', this.resScrap, scrap);
    this.updateResourceValue('chips', this.resChips, chips);
    this.updateResourceValue('concrete', this.resConcrete, concrete);
  }

  public setPopulation(current: number, max: number): void {
    if (this.resPop) {
      this.resPop.textContent = `${current}/${max}`;
      const item = this.resPop.closest('.resource-item');
      if (item) {
        item.classList.toggle('pop-capped', current >= max && max > 0);
        item.setAttribute(
          'title',
          current >= max
            ? 'Populacao no limite: construa abrigos para aumentar a capacidade.'
            : 'Populacao: unidades ativas / capacidade de abrigo. Construa abrigos para aumentar o teto.'
        );
      }
    }
  }

  public setEra(name: string): void {
    this.currentEraName.textContent = name;
    const era = document.getElementById('hud-era');
    if (era) {
      era.classList.remove('era-flash');
      void era.offsetWidth;
      era.classList.add('era-flash');
    }
  }

  // ------------------------------------------------------------------
  // 1.6.2 — Seleção + comandos + fila de produção
  // ------------------------------------------------------------------

  public updateSelection(selected: SelectableEntity[]): void {
    this.selectedIds = selected.map((e) => e.id);
    if (selected.length === 0) {
      this.selectionMain.innerHTML = `
        <div class="selection-empty">
          <div class="selection-empty-scanline"></div>
          <span>NENHUMA UNIDADE OU ESTRUTURA SELECIONADA</span>
        </div>
      `;
      this.commandsPanel.innerHTML = '';
      this.renderPortraits([]);
      this.clearProductionQueue();
      return;
    }

    if (selected.length === 1) {
      this.renderSingleCard(selected[0]);
      this.renderCommandsForEntity(selected[0]);
      this.renderPortraits(selected);
    } else {
      this.renderGroupCard(selected);
      this.renderGroupCommands();
      this.renderPortraits(selected);
    }
  }

  private factionLabelOf(faction: SelectableEntity['faction']): string {
    if (faction === 'RUST_WALKERS') return 'SUCATEIROS LIVRES';
    if (faction === 'IRON_VAULT') return 'ORDEM DOS BUNKERS';
    if (faction === 'SILICON_DISCIPLES') return 'FILHOS DO SILICIO';
    return 'FORCAS NEUTRAS';
  }

  private portraitUrl(baseName: string): string {
    return `/assets/portraits/${baseName}.webp`;
  }

  private portraitFor(entity: SelectableEntity): { url: string; fallback: string; sub: string } {
    if (entity instanceof Building) {
      if (entity.buildingType === 'COMMAND_CENTER') {
        return { url: this.portraitUrl('unit-command-center'), fallback: '/assets/portraits/command-center.jpg', sub: 'FORTIFICACAO PRIMARIA DE COMANDO' };
      }
      if (entity.buildingType === 'BUNKER_TURRET') {
        return { url: this.portraitUrl('unit-bunker-gunner'), fallback: '/assets/portraits/command-center.jpg', sub: 'DEFESA BALISTICA AUTOMATIZADA' };
      }
      return { url: this.portraitUrl('unit-command-center'), fallback: '/assets/portraits/command-center.jpg', sub: 'INSTALACAO INDUSTRIAL DE SUCATA' };
    }
    if (entity instanceof Unit) {
      if (entity.unitType === 'SCAVENGER_WORKER') {
        return { url: this.portraitUrl('era-1-scavenger'), fallback: '/assets/portraits/scavenger.jpg', sub: 'LOGISTICA E COLETA DE RECURSOS' };
      }
      if (entity.unitType === 'RUST_RAIDER') {
        return { url: this.portraitUrl('unit-bunker-gunner'), fallback: '/assets/portraits/soldier.jpg', sub: 'INFANTARIA DE ASSALTO TIER 1' };
      }
      if (entity.unitType === 'MAINTENANCE_DRONE') {
        return { url: this.portraitUrl('unit-maintenance-drone'), fallback: '/assets/portraits/scavenger.jpg', sub: 'DRONE DE MANUTENCAO E COLETA' };
      }
      if (entity.unitType === 'BIPED_MECH') {
        return { url: this.portraitUrl('unit-biped-mech'), fallback: '/assets/portraits/soldier.jpg', sub: 'MECH BIPEDE DE COMBATE' };
      }
      if (entity.unitType === 'SCRAP_BUGGY') {
        return { url: this.portraitUrl('unit-scrap-buggy'), fallback: '/assets/portraits/buggy.jpg', sub: 'VEICULO TATICO LIGEIRO TIER 1' };
      }
      return { url: this.portraitUrl('unit-scrap-buggy'), fallback: '/assets/portraits/buggy.jpg', sub: 'VEICULO TATICO LIGEIRO TIER 1' };
    }
    return { url: this.portraitUrl('era-1-scavenger'), fallback: '/assets/portraits/scavenger.jpg', sub: 'UNIDADE DE RECONHECIMENTO TATICO' };
  }

  private renderSingleCard(entity: SelectableEntity): void {
    const hpPct = Math.max(0, Math.round((entity.health / entity.maxHealth) * 100));
    const isLow = hpPct < 35;
    const factionLabel = this.factionLabelOf(entity.faction);
    const portrait = this.portraitFor(entity);
    const safeName = escapeHtml(entity.name.toUpperCase());

    this.selectionMain.innerHTML = `
      <div class="entity-card single">
        <div class="entity-avatar-frame">
          <img class="entity-portrait-img" src="${portrait.url}" alt="${safeName}" loading="lazy" onerror="this.src='${portrait.fallback}'" />
          <div class="portrait-scanline"></div>
          <div class="portrait-corner top-left"></div>
          <div class="portrait-corner bottom-right"></div>
        </div>
        <div class="entity-details">
          <div class="entity-title-row">
            <div>
              <div class="entity-name">${safeName}</div>
              <div class="entity-subclass">${portrait.sub}</div>
            </div>
            <span class="entity-faction-badge">${factionLabel}</span>
          </div>
          <div class="entity-hp-bar" role="progressbar" aria-label="Integridade da entidade" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${hpPct}">
            <div class="hp-fill ${isLow ? 'low' : ''}" style="width: ${hpPct}%"></div>
            <span class="hp-text">${entity.health} / ${entity.maxHealth} HP [${hpPct}%]</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderGroupCard(selected: SelectableEntity[]): void {
    const unitsCount = selected.filter((e) => e.category === 'UNIT').length;
    const bldCount = selected.filter((e) => e.category === 'BUILDING').length;
    const totalHp = selected.reduce((sum, e) => sum + e.health, 0);
    const maxHp = selected.reduce((sum, e) => sum + e.maxHealth, 0);
    const hpPct = maxHp > 0 ? Math.round((totalHp / maxHp) * 100) : 0;

    this.selectionMain.innerHTML = `
      <div class="entity-card multiple">
        <div class="entity-avatar-frame group-icon">
          ${ICONS.squad}
          <div class="portrait-scanline"></div>
          <div class="portrait-corner top-left"></div>
          <div class="portrait-corner bottom-right"></div>
        </div>
        <div class="entity-details">
          <div class="entity-title-row">
            <div>
              <div class="entity-name">${selected.length} DESTACAMENTOS SELECIONADOS</div>
              <div class="entity-subclass">FORCA-TAREFA TATICA COMBINADA</div>
            </div>
            <span class="entity-badge-count">${unitsCount} UNIDADES | ${bldCount} ESTRUTURAS</span>
          </div>
          <div class="entity-hp-bar" role="progressbar" aria-label="Integridade global" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${hpPct}">
            <div class="hp-fill" style="width: ${hpPct}%"></div>
            <span class="hp-text">INTEGRIDADE GLOBAL: ${hpPct}% (${totalHp}/${maxHp} HP)</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderPortraits(selected: SelectableEntity[]): void {
    if (!this.portraitsStrip) return;
    if (selected.length <= 1) {
      this.portraitsStrip.innerHTML = '';
      this.portraitsStrip.classList.add('hidden');
      return;
    }
    const visible = selected.slice(0, MAX_PORTRAITS);
    const extra = selected.length - visible.length;
    this.portraitsStrip.classList.remove('hidden');
    this.portraitsStrip.innerHTML =
      visible
        .map((e) => {
          const pct = e.maxHealth > 0 ? Math.round((e.health / e.maxHealth) * 100) : 0;
          const initial = escapeHtml(e.name.trim().charAt(0).toUpperCase() || '?');
          return `
          <button class="portrait-chip ${e.isSelected ? 'active' : ''}" data-entity-id="${escapeHtml(e.id)}"
            title="${escapeHtml(e.name)} — ${e.health}/${e.maxHealth} HP">
            <span class="portrait-chip-initial">${initial}</span>
            <span class="portrait-chip-hp"><span class="portrait-chip-hp-fill" style="width: ${pct}%"></span></span>
          </button>`;
        })
        .join('') +
      (extra > 0 ? `<span class="portrait-chip-more">+${extra}</span>` : '');
  }

  /** Define quais ordens estão habilitadas (custo/população) — painel atenua as bloqueadas. */
  public setOrderAvailability(fn: (order: OrderType) => boolean): void {
    this.orderAvailability = fn;
  }

  /** Reaplica a disponibilidade sobre os botões renderizados (chamado quando recursos mudam). */
  public refreshOrderAvailability(): void {
    if (!this.orderAvailability) return;
    const buttons = this.commandsPanel.querySelectorAll('[data-order]');
    buttons.forEach((b) => {
      const order = b.getAttribute('data-order') as OrderType;
      const ok = this.orderAvailability!(order);
      b.classList.toggle('order-disabled', !ok);
      b.setAttribute('aria-disabled', String(!ok));
    });
  }

  private orderButton(order: OrderType, icon: string, label: string, hotkey: string, primary: boolean): string {
    const disabled = this.orderAvailability && !this.orderAvailability(order);
    return `
      <button class="rts-btn ${primary ? 'primary' : ''} ${disabled ? 'order-disabled' : ''}" data-order="${order}" data-hotkey="${hotkey}"
        title="${label} [${hotkey}]" aria-label="${label} (atalho ${hotkey})" aria-disabled="${disabled}">
        ${icon}<span>${label} [${hotkey}]</span>
      </button>`;
  }

  private renderCommandsForEntity(entity: SelectableEntity): void {
    if (entity.category === 'UNIT') {
      const canGather =
        entity instanceof Unit &&
        (entity.unitType === 'SCAVENGER_WORKER' || entity.unitType === 'MAINTENANCE_DRONE');
      if (canGather) {
        this.commandsPanel.innerHTML =
          this.orderButton('move', ICONS.move, 'MOVER', 'M', true) +
          this.orderButton('gather', ICONS.production, 'COLETAR', 'G', true) +
          this.orderButton('patrol', ICONS.patrol, 'PATRULHA', 'P', false) +
          this.orderButton('stop', ICONS.stop, 'PARAR', 'S', false) +
          this.orderButton('disperse', ICONS.disperse, 'DISPERSAR', 'X', false) +
          this.orderButton('defend', ICONS.defend, 'DEFESA', 'D', false);
      } else {
        this.commandsPanel.innerHTML =
          this.orderButton('move', ICONS.move, 'MOVER', 'M', true) +
          this.orderButton('attack', ICONS.attack, 'ATACAR', 'A', false) +
          this.orderButton('patrol', ICONS.patrol, 'PATRULHA', 'P', false) +
          this.orderButton('stop', ICONS.stop, 'PARAR', 'S', false) +
          this.orderButton('defend', ICONS.defend, 'DEFESA', 'D', false) +
          this.orderButton('disperse', ICONS.disperse, 'DISPERSAR', 'X', false);
      }
    } else {
      this.commandsPanel.innerHTML =
        this.orderButton('recruit_worker', ICONS.recruit, 'CATADOR 50R', 'Q', true) +
        this.orderButton('recruit_guard', ICONS.attack, 'GUARDA 75R+25S', 'W', false) +
        this.orderButton('recruit_buggy', ICONS.patrol, 'BLINDADO 150S+25C', 'E', false) +
        this.orderButton('recruit_mech', ICONS.defend, 'MECH 200S+75Ch', 'R', false) +
        this.orderButton('recruit_drone', ICONS.production, 'DROIDE 60R+40S', 'T', false) +
        this.orderButton('rally', ICONS.rally, 'REUNIAO', 'V', false) +
        this.orderButton('repair', ICONS.repair, 'REPARO', 'F', false) +
        this.orderButton('research', ICONS.research, 'PESQUISA', 'B', false);
    }
  }

  private renderGroupCommands(): void {
    this.commandsPanel.innerHTML =
      this.orderButton('move', ICONS.move, 'MOVER', 'M', true) +
      this.orderButton('gather', ICONS.production, 'COLETAR', 'G', true) +
      this.orderButton('stop', ICONS.stop, 'PARAR', 'S', false) +
      this.orderButton('attack', ICONS.attack, 'ATACAR', 'A', false) +
      this.orderButton('patrol', ICONS.patrol, 'PATRULHA', 'P', false) +
      this.orderButton('disperse', ICONS.disperse, 'DISPERSAR', 'X', false);
  }

  private bindCommandClicks(): void {
    this.commandsPanel.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-order]');
      if (!target) return;
      if (target.classList.contains('order-disabled')) return;
      const order = (target as HTMLElement).getAttribute('data-order') as OrderType | null;
      if (!order) return;
      this.triggerOrder(order);
    });
    if (this.portraitsStrip) {
      this.portraitsStrip.addEventListener('click', (e) => {
        const chip = (e.target as HTMLElement).closest('[data-entity-id]');
        if (!chip) return;
        const id = (chip as HTMLElement).getAttribute('data-entity-id');
        if (id && this.orderCallbacks?.onPortraitClick) {
          this.orderCallbacks.onPortraitClick(id);
        }
      });
    }
  }

  /** Emite uma ordem para a seleção atual (stub: simulação conecta via bindOrderCallbacks). */
  public triggerOrder(order: OrderType): void {
    this.markActiveOrder(order);
    if (this.orderCallbacks) {
      this.orderCallbacks.onOrder(order, [...this.selectedIds]);
    }
  }

  private markActiveOrder(order: OrderType): void {
    const buttons = this.commandsPanel.querySelectorAll('[data-order]');
    buttons.forEach((b) => {
      b.classList.toggle('order-active', b.getAttribute('data-order') === order);
    });
  }

  // ---- Fila de produção (stub tipado, simulação alimenta depois) ----

  public setProductionQueue(items: ProductionItem[]): void {
    this.productionItems = [...items];
    this.renderProductionQueue();
  }

  public updateProductionProgress(ratio: number, label?: string): void {
    const clamped = Math.min(1, Math.max(0, ratio));
    if (this.productionFill) {
      this.productionFill.style.width = `${Math.round(clamped * 100)}%`;
      const track = this.productionFill.closest('.production-progress-track');
      if (track) track.setAttribute('aria-valuenow', String(Math.round(clamped * 100)));
    }
    if (label !== undefined && this.productionLabel) {
      this.productionLabel.textContent = label;
    }
  }

  public clearProductionQueue(): void {
    this.productionItems = [];
    this.renderProductionQueue();
    this.updateProductionProgress(0, 'FILA DE PRODUCAO');
  }

  private renderProductionQueue(): void {
    if (!this.productionQueue || !this.productionList) return;
    if (this.productionItems.length === 0) {
      this.productionQueue.classList.add('hidden');
      this.productionList.innerHTML = '';
      return;
    }
    this.productionQueue.classList.remove('hidden');
    this.productionList.innerHTML = this.productionItems
      .map(
        (item, index) => `
        <li class="production-item ${index === 0 ? 'active' : ''}" data-production-id="${escapeHtml(item.id)}">
          <span class="production-item-name">${escapeHtml(item.label)}</span>
          <span class="production-item-cost">${escapeHtml(item.cost)}</span>
        </li>`
      )
      .join('');
  }

  private bindProductionCancel(): void {
    const btn = document.getElementById('btn-cancel-production');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = this.productionItems[0];
        if (current && this.orderCallbacks?.onCancelProduction) {
          this.orderCallbacks.onCancelProduction(current.id);
        } else if (current) {
          this.setProductionQueue(this.productionItems.slice(1));
        }
      });
    }
  }

  // ------------------------------------------------------------------
  // 1.6.3 — Minimapa interativo (estrutura; main.ts mantém o desenho)
  // ------------------------------------------------------------------

  /**
   * Anexa interações extras do minimapa sem remover o handler de câmera
   * que main.ts já registra. Os callbacks repassam eventos normalizados
   * (0..1) para a simulação/câmera conectarem depois.
   */
  public bindMinimap(canvas: HTMLCanvasElement, callbacks: HudMinimapCallbacks): void {
    this.minimapCallbacks = callbacks;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      const { nx, ny } = HudController.minimapNormalized(canvas, e.clientX, e.clientY);
      if (e.button === 2) {
        this.handleMinimapRightClickOrder(nx, ny);
      } else if (e.button === 0) {
        this.handleMinimapClickMoveCamera(nx, ny);
      }
    });
  }

  public static minimapNormalized(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ): { nx: number; ny: number } {
    const rect = canvas.getBoundingClientRect();
    const nx = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const ny = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
    return {
      nx: Math.min(1, Math.max(0, nx)),
      ny: Math.min(1, Math.max(0, ny))
    };
  }

  public static minimapToWorld(
    nx: number,
    ny: number,
    mapSize: number
  ): { x: number; z: number } {
    return { x: nx * mapSize - mapSize / 2, z: ny * mapSize - mapSize / 2 };
  }

  /** Stub: clique com botão esquerdo move a câmera (main.ts já faz; callback opcional). */
  public handleMinimapClickMoveCamera(nx: number, ny: number): void {
    if (this.minimapCallbacks) this.minimapCallbacks.onMoveCamera(nx, ny);
  }

  /** Stub: clique com botão direito emite ordem no ponto do radar. */
  public handleMinimapRightClickOrder(nx: number, ny: number): void {
    if (this.minimapCallbacks) this.minimapCallbacks.onIssueOrder(nx, ny);
  }

  /** Exibe um ping temporário sobre o radar (camada DOM, sem tocar no canvas 2D). */
  public addPing(kind: PingKind, normalizedX: number, normalizedY: number): void {
    if (!this.minimapPingLayer) return;
    const ping = document.createElement('span');
    ping.className = `minimap-ping ping-${kind}`;
    ping.style.left = `${Math.min(1, Math.max(0, normalizedX)) * 100}%`;
    ping.style.top = `${Math.min(1, Math.max(0, normalizedY)) * 100}%`;
    this.minimapPingLayer.appendChild(ping);
    window.setTimeout(() => ping.remove(), PING_LIFETIME_MS);
  }

  public clearPings(): void {
    if (this.minimapPingLayer) this.minimapPingLayer.innerHTML = '';
  }

  // ------------------------------------------------------------------
  // 1.6.4 — Feed de eventos + alertas
  // ------------------------------------------------------------------

  public pushEvent(type: EventType, text: string): void {
    if (!this.eventList) return;
    const li = document.createElement('li');
    li.className = `event-item event-${type}`;
    const icon =
      type === 'perigo' ? ICONS.eventDanger
      : type === 'aviso' ? ICONS.eventWarning
      : type === 'sistema' ? ICONS.eventSystem
      : ICONS.eventInfo;
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    li.innerHTML = `
      <span class="event-icon" aria-hidden="true">${icon}</span>
      <span class="event-body">
        <span class="event-kind">${type.toUpperCase()}</span>
        <span class="event-text">${escapeHtml(text)}</span>
      </span>
      <span class="event-time">${time}</span>
    `;
    this.eventList.prepend(li);
    while (this.eventList.children.length > MAX_EVENTS) {
      this.eventList.lastElementChild?.remove();
    }
    if (!this.feedOpen) {
      this.unreadCount += 1;
      this.renderEventBadge();
    }
    window.setTimeout(() => {
      li.classList.add('event-dismissed');
      window.setTimeout(() => li.remove(), 400);
    }, EVENT_AUTO_DISMISS_MS);
  }

  public clearEvents(): void {
    if (this.eventList) this.eventList.innerHTML = '';
    this.unreadCount = 0;
    this.renderEventBadge();
  }

  public getUnreadCount(): number {
    return this.unreadCount;
  }

  public toggleEventFeed(force?: boolean): void {
    this.feedOpen = force ?? !this.feedOpen;
    if (this.eventFeed) this.eventFeed.classList.toggle('hidden', !this.feedOpen);
    const toggle = document.getElementById('btn-events-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(this.feedOpen));
    if (this.feedOpen) {
      this.unreadCount = 0;
      this.renderEventBadge();
    }
  }

  private renderEventBadge(): void {
    if (!this.eventBadge) return;
    this.eventBadge.textContent = String(this.unreadCount);
    this.eventBadge.classList.toggle('hidden', this.unreadCount === 0);
  }

  private bindEventFeedControls(): void {
    const toggle = document.getElementById('btn-events-toggle');
    if (toggle) toggle.addEventListener('click', () => this.toggleEventFeed());
    const close = document.getElementById('btn-close-events');
    if (close) close.addEventListener('click', () => this.toggleEventFeed(false));
    const clear = document.getElementById('btn-clear-events');
    if (clear) clear.addEventListener('click', () => this.clearEvents());
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'e' || e.key === 'E') this.toggleEventFeed();
      if (e.key === 'Escape' && this.feedOpen) this.toggleEventFeed(false);
    });
  }

  // ------------------------------------------------------------------
  // 1.6.5 — Mobile / touch (estrutura tipada; sem conflito com mouse)
  // ------------------------------------------------------------------

  public isMobileLayout(): boolean {
    return window.matchMedia('(max-width: 640px)').matches;
  }

  public setCompactMode(enabled: boolean): void {
    document.body.classList.toggle('hud-compact', enabled);
    const collapse = document.getElementById('btn-collapse-bottombar');
    if (collapse) {
      collapse.setAttribute('aria-expanded', String(!enabled));
      const icon = document.getElementById('collapse-icon');
      if (icon) icon.innerHTML = enabled ? ICONS.chevronUp : ICONS.chevronDown;
    }
    const bottom = document.getElementById('hud-bottombar');
    if (bottom) bottom.classList.toggle('collapsed', enabled);
  }

  private applyCompactModeFromViewport(): void {
    if (this.isMobileLayout()) {
      document.body.classList.add('hud-compact');
    } else {
      document.body.classList.remove('hud-compact');
      const bottom = document.getElementById('hud-bottombar');
      if (bottom) bottom.classList.remove('collapsed');
    }
  }

  private bindCollapseControl(): void {
    const btn = document.getElementById('btn-collapse-bottombar');
    if (btn) {
      btn.addEventListener('click', () => {
        const bottom = document.getElementById('hud-bottombar');
        const collapsed = bottom?.classList.toggle('collapsed') ?? false;
        btn.setAttribute('aria-expanded', String(!collapsed));
        const icon = document.getElementById('collapse-icon');
        if (icon) icon.innerHTML = collapsed ? ICONS.chevronUp : ICONS.chevronDown;
      });
    }
  }

  /**
   * Estrutura touch: toque = selecionar, arrasto = box, toque longo = ordem.
   * Registra callbacks sem interceptar o fluxo de mouse do SelectionManager:
   * usa TouchEvents com listeners passivos e só previne o padrão no long-press.
   */
  public setupTouchControls(canvas: HTMLCanvasElement, callbacks: HudTouchCallbacks): void {
    this.touchCallbacks = callbacks;

    canvas.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const timerId = window.setTimeout(() => {
          if (this.pendingTouch && !this.pendingTouch.moved) {
            this.pendingTouch.longPressFired = true;
            this.touchCallbacks?.onLongPressOrder(this.pendingTouch.startX, this.pendingTouch.startY);
          }
        }, LONG_PRESS_MS);
        this.pendingTouch = {
          startX: t.clientX,
          startY: t.clientY,
          lastX: t.clientX,
          lastY: t.clientY,
          startTime: Date.now(),
          moved: false,
          longPressFired: false,
          timerId
        };
      },
      { passive: true }
    );

    canvas.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (!this.pendingTouch || e.touches.length !== 1) return;
        const t = e.touches[0];
        this.pendingTouch.lastX = t.clientX;
        this.pendingTouch.lastY = t.clientY;
        const dist = Math.hypot(t.clientX - this.pendingTouch.startX, t.clientY - this.pendingTouch.startY);
        if (dist > DRAG_THRESHOLD_PX) this.pendingTouch.moved = true;
      },
      { passive: true }
    );

    const finishTouch = (): void => {
      if (!this.pendingTouch) return;
      const pending = this.pendingTouch;
      this.pendingTouch = null;
      window.clearTimeout(pending.timerId);
      if (pending.longPressFired) return;
      if (pending.moved) {
        this.touchCallbacks?.onDragBox(pending.startX, pending.startY, pending.lastX, pending.lastY);
      } else {
        void pending.startTime;
        this.touchCallbacks?.onTapSelect(pending.lastX, pending.lastY);
      }
    };

    canvas.addEventListener('touchend', finishTouch);
    canvas.addEventListener('touchcancel', () => {
      if (this.pendingTouch) window.clearTimeout(this.pendingTouch.timerId);
      this.pendingTouch = null;
    });
  }
}
