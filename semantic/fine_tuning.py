import os
import time
from pathlib import Path
import wandb
import obsidiantools.api as otools
from obsidiantools.api import Vault
import fire
from tqdm import tqdm
from datetime import datetime
import pandas as pd

def st_ft(
    vault: Vault,
    use_wandb: bool = True,
    model_name="sentence-transformers/multi-qa-MiniLM-L6-cos-v1",
    epochs: int = 10,
    evaluation_dataset_path: str = None,
    save: bool = True,
):
    """
    Fine-tune a Sentence Transformer model.
    :param vault: Obsidian vault.
    :param use_wandb: Whether to use wandb.
    :param model_name: Model name.
    :param epochs: Number of epochs.
    :param evaluation_dataset_path: Path to the evaluation dataset.
    :param save: Whether to save the model.
    """
    # if model seems to be local directory, print something to say it
    if os.path.isdir(model_name):
        print(f"Loading model from local directory: {model_name}")

    # Define a list with sentences (1k - 100k sentences)
    corpus = []

    for k, v in vault.readable_text_index.items():
        corpus.append(f"File:\n{k}\nTags:\n{vault.get_tags(k, show_nested=True)}\nContent:\n{v}")

    from sentence_transformers import SentenceTransformer
    from sentence_transformers import models, datasets, evaluation, losses
    from torch.utils.data import DataLoader

    word_embedding_model = models.Transformer(model_name)
    pooling_model = models.Pooling(
        word_embedding_model.get_word_embedding_dimension(), "cls"
    )
    model = SentenceTransformer(modules=[word_embedding_model, pooling_model])

    if evaluation_dataset_path:
        # check it's a json file
        assert evaluation_dataset_path.endswith(
            ".json"
        ), "Evaulation dataset must be a json file"

        evaluation_dataset = (
            pd.read_json(evaluation_dataset_path) if evaluation_dataset_path else None
        )

        # check columns are sentences1, sentences2, scores
        assert [
            "sentences1",
            "sentences2",
            "scores",
        ] == evaluation_dataset.columns.to_list(), (
            "Evaluation dataset must have columns sentences1, sentences2, scores"
        )

        from sentence_transformers import evaluation

        evaluator = evaluation.EmbeddingSimilarityEvaluator(
            evaluation_dataset.sentences1.to_list()[0],
            evaluation_dataset.sentences2.to_list()[0],
            evaluation_dataset.scores.to_list()[0],
        )

    # Create the special denoising dataset that adds noise on-the-fly
    train_dataset = datasets.DenoisingAutoEncoderDataset(corpus)

    # DataLoader to batch your data
    train_dataloader = DataLoader(train_dataset, batch_size=8, shuffle=True)

    # Use the denoising auto-encoder loss
    train_loss = losses.DenoisingAutoEncoderLoss(
        model, decoder_name_or_path=model_name, tie_encoder_decoder=True
    )

    def wandb_logger(score: float, epoch: int, step: int):
        wandb.log({"score": score, "epoch": epoch}, step=step*epoch)

    clean_name = model_name.split("/")[-1]
    model_name = (
        f"{clean_name}-obsidian" if "obsidian" not in clean_name else clean_name
    )
    output_path = f"output/{model_name}"

    # Call the fit method
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=epochs,
        # weight_decay=0,
        # scheduler="constantlr",
        # optimizer_params={"lr": 3e-5},
        show_progress_bar=True,
        evaluator=evaluator if evaluation_dataset_path else None,
        evaluation_steps=10 if evaluation_dataset_path else 0,
        save_best_model=True,
        callback=wandb_logger if use_wandb else None,
        checkpoint_path=output_path,
        checkpoint_save_steps=50,
        checkpoint_save_total_limit=5,
        steps_per_epoch=50,
    )

    if save:
        model.save(path=output_path, model_name=model_name)
        model.save_to_hub(model_name, exist_ok=True)
        print(f"Model saved to {model_name}-obsidian")

    # return local model name
    return output_path


def fine_tune(
    use_wandb: bool = True,
    model_name="sentence-transformers/multi-qa-MiniLM-L6-cos-v1",
    auto: bool = False,
    epochs: int = 10,
    evaluation_dataset_path: str = None,
    save: bool = True,
):
    """
    Fine-tune a Sentence Transformer model.
    :param use_wandb: Whether to use wandb.
    :param model_name: Model name.
    :param auto: Whether to fine-tune automatically according to the Obsidian vault changes.
    :param epochs: Number of epochs.
    :param evaluation_dataset_path: Path to the evaluation dataset.
    :param save: Whether to save the model.
    """
    # two level above the current directory
    wkd = Path(os.getcwd()).parent.parent.parent
    print("Loading vault...")

    vault = otools.Vault(wkd).connect(show_nested_tags=True).gather()

    if use_wandb:
        import wandb
        import re

        values = open(".env.production", "r").read()
        key = re.findall(r"WANDB_KEY=\"(.*)\"", values)[0]
        wandb.login(key=key, relogin=True)
        run = wandb.init(project=f"obsidian")
        print(f"Wandb logged in, run: {run.name}")

    local_model_directory = st_ft(
        vault, use_wandb, model_name, epochs, evaluation_dataset_path, save
    )
    # TODO: either "poll fine-tuning" or through api query or detect vault changes
    # if auto:
    #     import schedule

    #     def job():
    #         # TODO: only ft when enough file content changed
    #         print("Files changed, fine-tuning...")
    #         vault = otools.Vault(wkd).connect(show_nested_tags=True).gather()
    #         st_ft(
    #             vault,
    #             use_wandb,
    #             local_model_directory,
    #             epochs=1,
    #             evaluation_dataset_path=evaluation_dataset_path,
    #             save=True,
    #         )

    #     job()
    #     schedule.every(10).minutes.do(job)
    #     while True:
    #         schedule.run_pending()
    #         time.sleep(1)



if __name__ == "__main__":
    fire.Fire(
        {
            "fine_tune": fine_tune,
        }
    )
