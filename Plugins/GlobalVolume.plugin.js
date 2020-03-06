//META{"name":"GlobalVolume","source":"https://github.com/MurmursOnSARS/BBDStuff/blob/master/Plugins/GlobalVolume.plugin.js/","website":"https://github.com/MurmursOnSARS","authorId":"660699868041314334"}*//
/*@cc_on
@if (@_jscript)

	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject('WScript.Shell');
	var fs = new ActiveXObject('Scripting.FileSystemObject');
	var pathPlugins = shell.ExpandEnvironmentStrings('%APPDATA%\\BetterDiscord\\plugins');
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup('It looks like you\'ve mistakenly tried to run me directly. \n(Don\'t do that!)', 0, 'I\'m a plugin for BetterDiscord', 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup('I\'m in the correct folder already.\nJust reload Discord with Ctrl+R.', 0, 'I\'m already installed', 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup('I can\'t find the BetterDiscord plugins folder.\nAre you sure it\'s even installed?', 0, 'Can\'t install myself', 0x10);
	} else if (shell.Popup('Should I copy myself to BetterDiscord\'s plugins folder for you?', 0, 'Do you need some help?', 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec('explorer ' + pathPlugins);
		shell.Popup('I\'m installed!\nJust reload Discord with Ctrl+R.', 0, 'Successfully installed', 0x40);
	}
	WScript.Quit();

@else@*/

// to do:
// 1--DONE--mutliple user ids in textbox (regex?)
// 2--DONE--show error toast on invalid keybind
// 3--DONE--include sliders in settings for max volume (0 to inf) and step size
// 4--DONE--port keybind conversion to windows and linux using WebpackModules.getByProps('toCombo')
// 5--------wait for fix from zere to get onUpdate keybinds (and others?) working. CURRENTLY: requires turning plugin off then on to update some settings

var GlobalVolume = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'GlobalVolume',
      authors: [
        {
          name: 'MurmursOnSARS',
          discord_id: '660699868041314334',
          github_username: 'MurmursOnSARS',
          twitter_username: 'who_uses_twitter'
        }
      ],
      version: '1.0.0',
      description: 'Use custom keybinds to control either the volume of specific users or everyone in the same voice channel as you, even when Discord isn\'t focused.',
      github: 'https://github.com/MurmursOnSARS',
      github_raw: 'https://raw.githubusercontent.com/MurmursOnSARS/BBDStuff/master/Plugins/GlobalVolume.plugin.js'
    },
    changelog: [
      {
        title: 'Hello party people!!!',
        type: 'added',
        items: ['Spring break is coming!']
      }
    ],
    defaultConfig: [
      {
        type: 'textbox',
        id: 'userids',
        value: '',
        name: 'User IDs',
        note: 'Enter the user IDs whose volumes you want to control, separated by commas.'
      },
      {
        type: 'switch',
        id: 'allVC',
        value: false,
        name: 'Channel Control',
        note: 'Enable to override above IDs and control the volume of everyone in any current voice channel.'
      },
      {
        type: 'keybind',
        id: 'volumeUp',
        value: [67],
        name: 'Increase Volume Keybind'
      },
      
      {
        type: 'keybind',
        id: 'volumeDown',
        value: [68],
        name: 'Decrease Volume Keybind'
      },
      
      {
        type: 'keybind',
        id: 'volumeReset',
        value: [69],
        name: 'Reset User Volume Keybind'
      },
      {
        type: 'slider',
        id: 'resetVol',
        value: 100,
        name: 'Reset Volume Level',
        min: 0,
        max: 200
      },
      {
        type: 'slider',
        id: 'stepSize',
        value: 20,
        name: 'Volume Change Step Size',
        note: 'Fine-tune this value to your heart\'s content. Works well around 20.',
        min: 0,
        max: 100
      },
      {
        type: 'slider',
        id: 'maxVol',
        value: 200,
        name: 'Max Volume',
        note: 'This is here to prevent ear destruction. Set to 100% for the full range Discord normally shows on the volume slider. Set to 0% for infinite volume.',
        min: 0,
        max: 200
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { WebpackModules, Toasts } = Api;
    var voiceLoc = WebpackModules.getByProps('_voiceChannelGuildId');
    var voiceState = WebpackModules.getByProps('getVoiceState').__proto__;
    var setLV = WebpackModules.getByProps('setLocalVolume');
    var getLV = WebpackModules.getByProps('getLocalVolume').__proto__;
    var compatibility = WebpackModules.getByProps('toCombo');
    var system = compatibility.getEnv();  // Windows: 1, MacOS: 2, Linux: 3, Browser: 4 . if you get a 4 here, i'm honestly impressed
    var electron = require("electron");
    
    return class GlobalVolume extends Plugin {
      
      onStart() {
        this.keyCheckAndConvert(this.settings.volumeUp,this.settings.volumeDown,this.settings.volumeReset); 
      }
      onStop() {
        this.unlisten();
      }
      
      keyCheckAndConvert(bindUp,bindDown,bindReset) {
        if(!Array.isArray(bindUp) || !Array.isArray(bindDown) || !Array.isArray(bindReset)) {
          return Toasts.show('Unsupported; how did you manage this?',{type:'error',timeout:5000});
        }
        var stringUp = '';
        bindUp.forEach(el => {
          if(stringUp !== '') stringUp += '+';
          stringUp += compatibility.codeToKey([1,el,system]);
        });
        var stringDown = '';
        bindDown.forEach(el => {
          if(stringDown !== '') stringDown += '+';
          stringDown += compatibility.codeToKey([1,el,system]);
        });
        var stringReset = '';
        bindReset.forEach(el => {
          if(stringReset !== '') stringReset += '+';
          stringReset += compatibility.codeToKey([1,el,system]);
        });
        this.listen(stringUp,stringDown,stringReset);
      }

      /* Listener */
      listen(stringUp,stringDown,stringReset) {
        try {
          if(this.settings.allVC) {   // if true, ignore userids and finds all users if in VC. find funcs must be inside the register so that they update
            electron.remote.globalShortcut.unregisterAll();
            electron.remote.globalShortcut.register(stringUp, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of Object.keys(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId])) {
                if(this.settings.maxVol !== 0) {
                  setLV.setLocalVolume(user, Math.min((getLV.getLocalVolume(user) + this.settings.stepSize), this.settings.maxVol));
                }
                if(this.settings.maxVol === 0) {
                  setLV.setLocalVolume(user, getLV.getLocalVolume(user) + this.settings.stepSize);
                }
              }
            });
            electron.remote.globalShortcut.register(stringDown, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of Object.keys(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId])) {
                setLV.setLocalVolume(user, Math.max((getLV.getLocalVolume(user) - this.settings.stepSize), 0));
              }
            });
            electron.remote.globalShortcut.register(stringReset, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of Object.keys(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId])) {
                setLV.setLocalVolume(user, this.settings.resetVol);
              }
            });
          }
          if(!this.settings.allVC) {    // if false, use userids to control specific users. Limited to current VC because otherwise, volume is changed for every user even outside VC
            electron.remote.globalShortcut.unregisterAll();
            electron.remote.globalShortcut.register(stringUp, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;    // not necessary, but better than alternative imo
              for (var user of this.settings.userids.split(/, */)) {
                if(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId][user]) {
                  if(this.settings.maxVol !== 0) {
                    setLV.setLocalVolume(user, Math.min((getLV.getLocalVolume(user) + this.settings.stepSize), this.settings.maxVol));
                  }
                  if(this.settings.maxVol === 0) {
                    setLV.setLocalVolume(user, getLV.getLocalVolume(user) + this.settings.stepSize);
                  }
                }
              }
            });
            electron.remote.globalShortcut.register(stringDown, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of this.settings.userids.split(/, */)) {
                if(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId][user]) {
                  setLV.setLocalVolume(user, Math.max((getLV.getLocalVolume(user) - this.settings.stepSize), 0));
                }
              }
            });
            electron.remote.globalShortcut.register(stringReset, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of this.settings.userids.split(/, */)) {
                if(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId][user]) {
                  setLV.setLocalVolume(user, this.settings.resetVol);
                }
              }
            });
          }
        }
        catch (e) {
          electron.remote.globalShortcut.unregisterAll();
          Toasts.show('Unsupported; keybinds cannot contain solely modifier keys (shift, alt, control, etc.)',{type:'error',timeout:5000});
        }
      }
      
      unlisten() {
        electron.remote.globalShortcut.unregisterAll();
      }
      /* Listener */
      
      getSettingsPanel() {
        const panel = this.buildSettingsPanel();
        /*
        panel.append(this.buildSetting({
          type: 'keybind',
          id: 'volumeDown',
          value: [69],
          name: 'Decrease Volume Keybind',
          onChange: value => {
            this.settings['volumeDown'] = value;
            console.log(this.settings['volumeDown']);
            console.log(this.settings.volumeDown);
            console.log(value);
          }
        }));
        */
        return panel.getElement();
      }
      
      get [Symbol.toStringTag]() {
        return 'Plugin';
      }
      get name() {
        return config.info.name;
      }
      get short() {
        let string = '';

        for (let i = 0, len = config.info.name.length; i < len; i++) {
          const char = config.info.name[i];
          if (char === char.toUpperCase()) string += char;
        }

        return string;
      }
      get author() {
        return config.info.authors.map(author => author.name).join(', ');
      }
      get version() {
        return config.info.version;
      }
      get description() {
        return config.info.description;
      }
    };
  };

  /* Finalize */

  return !global.ZeresPluginLibrary
    ? class {
        getName() {
          return this.name.replace(/\s+/g, '');
        }
        getAuthor() {
          return this.author;
        }
        getVersion() {
          return this.version;
        }
        getDescription() {
          return this.description;
        }
        stop() {}
        load() {
          const header = `Missing Library`;
          const content = `The Library ZeresPluginLibrary required for ${this.name} is missing.`;
          const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
          const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
          const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
          const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the library yourself.<br/><br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>`);
          if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
          ModalStack.push(props => {
            return BdApi.React.createElement(
              ConfirmationModal,
              Object.assign(
                {
                  header,
                  children: [TextElement({ color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to install it.`] })],
                  red: false,
                  confirmText: 'Download Now',
                  cancelText: 'Cancel',
                  onConfirm: () => {
                    const request = require('request');
                    const fs = require('fs');
                    const path = require('path');
                    const waitForLibLoad = callback => {
                      if (!global.BDEvents) return callback();
                      const onLoaded = e => {
                        if (e !== 'ZeresPluginLibrary') return;
                        BDEvents.off('plugin-loaded', onLoaded);
                        callback();
                      };
                      BDEvents.on('plugin-loaded', onLoaded);
                    };
                    request('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                      if (error) return onFail();
                      fs.writeFile(path.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), body, () => {});
                      waitForLibLoad(() => pluginModule.reloadPlugin(this.name));
                    });
                  }
                },
                props
              )
            );
          });
        }
        start() {}
        get [Symbol.toStringTag]() {
          return 'Plugin';
        }
        get name() {
          return config.info.name;
        }
        get short() {
          let string = '';
          for (let i = 0, len = config.info.name.length; i < len; i++) {
            const char = config.info.name[i];
            if (char === char.toUpperCase()) string += char;
          }
          return string;
        }
        get author() {
          return config.info.authors.map(author => author.name).join(', ');
        }
        get version() {
          return config.info.version;
        }
        get description() {
          return config.info.description;
        }
      }
    : buildPlugin(global.ZeresPluginLibrary.buildPlugin(config));
})();

/*@end@*/
