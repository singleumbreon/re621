import { Danbooru } from "../../components/api/Danbooru";
import { PageDefinition } from "../../components/data/Page";
import { User } from "../../components/data/User";
import { ModuleController } from "../../components/ModuleController";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Handles scaling post images in an intelligent way
 */
export class ImageScaler extends RE6Module {

    private post: Post;
    private image: JQuery<HTMLElement>;

    private resizeSelector: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefinition.post, true);
        this.registerHotkeys(
            { keys: "hotkeyScale", fnct: () => { this.setScale(); } },
            { keys: "hotkeyFullscreen", fnct: this.openFullscreen },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            hotkeyScale: "v|0",         // cycle through the various scaling modes
            hotkeyFullscreen: "",       // open the current post in fullscreen mode

            clickScale: true,           // click on the image to change the scale
            clickShowFiltered: false,   // click on blacklisted image to show it

            size: ImageSize.Fill,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        // Move the note preview to root
        $("#note-preview").insertBefore("#page");

        // Create the selector
        this.post = Post.getViewingPost();
        this.image = $("img#image");

        const resizeButtonContainer = $("#image-resize-cycle").empty();
        if (this.image.attr("src") !== "/images/blacklisted-preview.png")
            this.setImageSize(this.fetchSettings("size"));

        this.resizeSelector = $("<select>")
            .html(`
                <option value="${ImageSize.Sample}">Sample</option>
                <option value="${ImageSize.Fill}">Fill Screen</option>
                <option value="${ImageSize.Fit}">Fit Horizontally</option>
                <option value="${ImageSize.Original}">Original</option>
            `)
            .val(this.fetchSettings("size"))
            .addClass("button btn-neutral")
            .appendTo(resizeButtonContainer)
            .on("change", async (event, save) => {
                const size = $(event.target).val() + "";
                this.setImageSize(size);
                if (save !== false) {
                    await this.pushSettings("size", size);
                    switch (size) {
                        case ImageSize.Sample: {
                            await User.setSettings({ default_image_size: "large" });
                            break;
                        }
                        case ImageSize.Fill:
                        case ImageSize.Fit: {
                            await User.setSettings({ default_image_size: "fit" });
                            break;
                        }
                        case ImageSize.Original: {
                            await User.setSettings({ default_image_size: "original" });
                            break;
                        }
                    }
                }
            });

        $("#image-download-link a").html("Fullscreen");

        this.image.on("click", async () => {
            if (!this.fetchSettings("clickScale") || await Danbooru.Note.TranslationMode.active()) return;
            if (this.image.attr("src") == "/images/blacklisted-preview.png") {
                if (this.fetchSettings("clickShowFiltered"))
                    this.setScale("current", false);
                return;
            }
            this.setScale("", false);
        });
        this.toggleClickScale(this.fetchSettings<boolean>("clickScale"));

    }

    /**
     * Sets a new scale for the post image
     * @param size New size. If none specified, cycles to the next in the list
     * @param save Set to false to prevent saving the scale to settings
     */
    private setScale(size = "", save = true): void {
        const selector = ModuleController.get(ImageScaler).resizeSelector;
        if (size === "") {
            const $next = selector.find("option:selected").next();
            if ($next.length > 0) { size = $next.val() + ""; }
            else { size = selector.find("option").first().val() + ""; }
        } else if (size == "current")
            size = selector.find("option:selected").val() + "";

        selector.val(size).trigger("change", save);
    }

    /**
     * Set the page image to the specified size
     * @param size sample, fit-horizontal, fit-vertical, or original
     */
    private setImageSize(size: string): void {
        this.image.removeClass();
        this.image.parent().addClass("loading");

        this.image.on("load", () => {
            Danbooru.Note.Box.scale_all();
            this.image.parent().removeClass("loading");
        });

        switch (size) {
            case (ImageSize.Sample): {
                this.image.attr("src", this.post.file.sample);
                break;
            }
            case (ImageSize.Fill): {
                this.image.addClass("re621-fit-vertical");
                if (this.image.attr("src") !== this.post.file.original) {
                    this.image.attr("src", this.post.file.original);
                } else { this.image.parent().removeClass("loading"); }
                break;
            }
            case (ImageSize.Fit): {
                this.image.addClass("re621-fit-horizontal");
                if (this.image.attr("src") !== this.post.file.original) {
                    this.image.attr("src", this.post.file.original);
                } else { this.image.parent().removeClass("loading"); }
                break;
            }
            case (ImageSize.Original): {
                if (this.image.attr("src") !== this.post.file.original) {
                    this.image.attr("src", this.post.file.original);
                } else { this.image.parent().removeClass("loading"); }
                break;
            }
        }

        Danbooru.Note.Box.scale_all();
    }

    /** Opens the post in fullscreen mode */
    private openFullscreen(): void {
        $("#image-download-link a")[0].click();
    }

    /** Sets the appropriate click-scale style */
    public toggleClickScale(state = true): void {
        $("#image-container").toggleClass("click-scale", state);
    }

}

enum ImageSize {
    Sample = "sample",
    Fill = "fit-vertical",
    Fit = "fit-horizontal",
    Original = "original",
}
