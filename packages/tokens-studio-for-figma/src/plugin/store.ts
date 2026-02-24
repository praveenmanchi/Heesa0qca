type State = {
  inspectDeep: boolean;
  shouldSendSelectionValues: boolean;
  autoApplyThemeOnDrop: boolean;
};

const store: State = {
  inspectDeep: true,
  shouldSendSelectionValues: false,
  autoApplyThemeOnDrop: false,
};

export default store;
