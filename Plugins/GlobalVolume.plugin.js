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
// 1------Possibly figure out the transform from localVolume to real volume, might take 2 functions and fuzzing around 100
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
      version: '1.1.0',
      description: 'Map custom keybinds to control either the volume of specific users or everyone in the same voice channel as you, even when Discord isn\'t focused. Windows users may have to run Discord in administrator mode for some applications.',
      github: 'https://github.com/MurmursOnSARS',
      github_raw: 'https://raw.githubusercontent.com/MurmursOnSARS/BBDStuff/master/Plugins/GlobalVolume.plugin.js'
    },
    changelog: [
      {
        title: 'Hello party people!!!',
        type: 'added',
        items: ['Spring break is coming!']
      },
      {
        title: 'Woah',
        type: 'fixed',
        items: ['_Markdown?_ Insane. Anyways, switched to a more global keybind system that also doesn\'t override other keybinds. Also no need to reload to save settings anymore!']
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
    var event = WebpackModules.getByProps('inputEventRegister');
    const huh = {
      focused: true,
      blurred: true,
      keydown: true,
      keyup: false
    };
    var compatibility = WebpackModules.getByProps('toCombo');
    var system = compatibility.getEnv();  // Windows: 1, MacOS: 2, Linux: 3, Browser: 4 . if you get a 4 here, i'm honestly impressed
    // var electron = require("electron");
    
    return class GlobalVolume extends Plugin {
      
      onStart() {
        this.keyCheckAndConvert(this.settings.volumeUp,this.settings.volumeDown,this.settings.volumeReset); 
      }
      onStop() {
        this.unlisten();
      }
      
      keyCheckAndConvert(bindUp,bindDown,bindReset) {
        if(!Array.isArray(bindUp) || !Array.isArray(bindDown) || !Array.isArray(bindReset)) {
          return Toasts.show('Unsupported; how did you even manage this?',{type:'error',timeout:5000});
        }
        var arrayUp = [];
        bindUp.forEach(x => arrayUp.push([0,x,system]));
        var arrayDown = [];
        bindDown.forEach(x => arrayDown.push([0,x,system]));
        var arrayReset = [];
        bindReset.forEach(x => arrayReset.push([0,x,system]));
        // console.log(arrayUp,arrayDown,arrayReset);
        this.listen(arrayUp,arrayDown,arrayReset);
      }

      /* Listener */
      listen(arrayUp,arrayDown,arrayReset) {
        try {
          if(this.settings.allVC) {   // if true, ignore userids and finds all users if in VC. find funcs must be inside the register so that they update
            event.inputEventRegister(118, arrayUp, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of Object.keys(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId])) {
                if(this.settings.maxVol !== 0) {
                  setLV.setLocalVolume(user, Math.min((getLV.getLocalVolume(user) + this.settings.stepSize), this.settings.maxVol));
                }
                if(this.settings.maxVol === 0) {
                  setLV.setLocalVolume(user, getLV.getLocalVolume(user) + this.settings.stepSize);
                }
              }
            }, huh);
            event.inputEventRegister(9998, arrayDown, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of Object.keys(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId])) {
                setLV.setLocalVolume(user, Math.max((getLV.getLocalVolume(user) - this.settings.stepSize), 0));
              }
            }, huh);
            event.inputEventRegister(8199, arrayReset, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of Object.keys(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId])) {
                setLV.setLocalVolume(user, this.settings.resetVol);
              }
            }, huh);
          }
          if(!this.settings.allVC) {  // if false, use userids to control specific users. Limited to current VC because otherwise, volume is changed for every user even outside VC
            event.inputEventRegister(118, arrayUp, () => {
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
            }, huh);
            event.inputEventRegister(9998, arrayDown, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of this.settings.userids.split(/, */)) {
                if(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId][user]) {
                  setLV.setLocalVolume(user, Math.max((getLV.getLocalVolume(user) - this.settings.stepSize), 0));
                }
              }
            }, huh);
            event.inputEventRegister(8199, arrayReset, () => {
              if(!voiceLoc._voiceChannelGuildId || !voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId]) return;
              for (var user of this.settings.userids.split(/, */)) {
                if(voiceState.getAllVoiceStates()[voiceLoc._voiceChannelGuildId][user]) {
                  setLV.setLocalVolume(user, this.settings.resetVol);
                }
              }
            }, huh);
          }
        }
        catch (e) {
          event.inputEventUnregister(118);
          event.inputEventUnregister(9998);
          event.inputEventUnregister(8199);
          Toasts.show('Unsupported; don\'t know how you messed this up lol)',{type:'error',timeout:5000});
        }
      }
      
      unlisten() {
        event.inputEventUnregister(118);
        event.inputEventUnregister(9998);
        event.inputEventUnregister(8199);
      }
      /* Listener */
      
      getSettingsPanel() {
        const panel = this.buildSettingsPanel();
        
        panel.addListener((id) => {
          if(id == 'allVC' || id == 'volumeUp' || id == 'volumeDown' || id == 'volumeReset') {
            this.keyCheckAndConvert(this.settings.volumeUp,this.settings.volumeDown,this.settings.volumeReset);
          }
        });
        
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
