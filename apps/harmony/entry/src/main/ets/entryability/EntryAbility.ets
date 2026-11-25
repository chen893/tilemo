import { Configuration, ConfigurationConstant, UIAbility } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';

export default class EntryAbility extends UIAbility {
  onWindowStageCreate(stage: window.WindowStage): void {
    this.onConfigurationUpdate(this.context.config);
    stage.loadContent('pages/Index');
  }

  onForeground(): void {
    AppStorage.setOrCreate('foreground', true);
  }

  onBackground(): void {
    AppStorage.setOrCreate('foreground', false);
  }

  onConfigurationUpdate(config: Configuration): void {
    AppStorage.setOrCreate('systemDark', config.colorMode === ConfigurationConstant.ColorMode.COLOR_MODE_DARK);
  }
}
